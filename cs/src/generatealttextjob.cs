using System.Buffers.Text;
using System.Text;
using System.Text.Json;
using ImageMagick;
using kouki2.Controllers;
using Shipwreck.Phash;

public class LLamaImageData
{
  public string data { get; set; }
  public Int64 id { get; set; }
}

public class LLamaRequest
{
  public string prompt { get; set; }
  public LLamaImageData[] image_data { get; set; }
}

public class LLamaResponse
{
  public string content { get; set; }
}

public class ComputeTextEmbeddingRequest
{
  public string text { get; set; }
}

public class ComputeTextEmbeddingResponse
{
  public double[] numpy_data { get; set; }
}

public class GenerateAltTextJob : IJob
{
  private bool _completed = false;
  private ProcessCollectionStatusResponse _status = new ProcessCollectionStatusResponse();
  private ProcessCollectionJobRequest _request;

  public bool Completed => _completed;

  public object Status => _status;


  public async void Run()
  {
    _status.result = ResultResponse.Processing;

    IEnumerable<CollectionItem> items;

    if (_request.collKind == "all")
    {
      items = PhotoFs.Instance.PhotoDb.GetLibraryItems();
    }
    else if (_request.collKind == "folder")
    {
      items = PhotoFs.Instance.GetCollectionItems(_request.collId);
    }
    else
    {
      items = PhotoFs.Instance.GetCollectionItems(_request.collId);
    }

    using (var client = new HttpClient())
    {
      foreach (var item in items)
      {
        try
        {
          bool ret = await ProcessItem(client, item.photoId, _request.forceUpdate);
          if (ret)
          {
            _status.processedFiles++;
          }
          else
          {
            _status.skippedFiles++;
          }
        }
        catch (Exception e)
        {
          // _status.result = ResultResponse.Failed;
          // _status.message = e.Message;
          // _completed = true;
          _status.skippedFiles++;
          Console.WriteLine("AltText: failed to process:" + e.Message);
        }
      }

      _status.result = ResultResponse.Done;
      _completed = true;
    }
  }

  public static async Task<bool> ProcessItem(HttpClient client, Int64 imageId, bool forceUpdate = false)
  {
    if (!forceUpdate)
    {
      var alttext = PhotoFs.Instance.PhotoDb.GetPhotoAltText(imageId);
      if (alttext != null)
      {
        return false;
      }
    }

    var imageData = GetImageBase64(imageId);

    var request = new LLamaRequest()
    {
      //      prompt = "Detailed image analysis dialogue.\nUSER:[img-1] Provide a brief, concise description of this image, highlighting only the most essential elements in a few words.\nASSISTANT:",
      prompt = @"Detailed image analysis dialogue.
USER:[img-1] I need a thorough analysis of this image, including all elements, colors, and any noticeable features.
ASSISTANT:",

      image_data = new LLamaImageData[1] { new LLamaImageData() { data = imageData, id = 1 } }
    };

    var requestData = JsonSerializer.Serialize(request);
    using (var response = await client.PostAsync("http://localhost:8080/completion", new StringContent(requestData)))
    {
      var responseText = await response.Content.ReadAsStringAsync();

      //Console.WriteLine(responseText);
      var responseObj = JsonSerializer.Deserialize<LLamaResponse>(responseText);
      if (responseObj.content != null)
      {
        PhotoFs.Instance.PhotoDb.UpdatePhotoAltText(imageId, responseObj.content);
        PhotoFs.Instance.PhotoDb.UpdateAltText(imageId, responseObj.content);
      }

      var emb = await ComputeTextEmbedding(client, responseObj.content);
      var embBuf = SerializeEmbedding(emb);
      PhotoFs.Instance.PhotoDb.UpdatePhotoAltTextEmbedding(imageId, embBuf);
    }

    return true;
  }

  private static byte[] SerializeEmbedding(double[] array)
  {
    int bufferSize = sizeof(double) * array.Length;
    byte[] buffer = new byte[bufferSize];

    for (int i = 0; i < array.Length; i++)
    {
      byte[] doubleBytes = BitConverter.GetBytes(array[i]);
      Array.Copy(doubleBytes, 0, buffer, i * sizeof(double), sizeof(double));
    }

    return buffer;
  }

  private static async Task<double[]> ComputeTextEmbedding(HttpClient client, string text)
  {
    var request = new ComputeTextEmbeddingRequest() { text = text };
    var requestData = JsonSerializer.Serialize(request);
    using (var response = await client.PostAsync("http://localhost:5050/api/textembedding",
      new StringContent(requestData, Encoding.UTF8,
                                    "application/json")))
    {
      var responseText = await response.Content.ReadAsStringAsync();
      var responseObj = JsonSerializer.Deserialize<ComputeTextEmbeddingResponse>(responseText);
      return responseObj.numpy_data;
      //Console.WriteLine(responseObj?.numpy_data?.Length);
    }
  }

  private static double[] DeserializeTextEmbedding(byte[] buffer)
  {
    int numDoubles = buffer.Length / sizeof(double);
    double[] result = new double[numDoubles];

    byte[] doubleBytes = new byte[sizeof(double)];
    for (int i = 0; i < numDoubles; i++)
    {
      Array.Copy(buffer, i * sizeof(double), doubleBytes, 0, sizeof(double));
      result[i] = BitConverter.ToDouble(doubleBytes, 0);
    }

    return result;
  }
  public GenerateAltTextJob(ProcessCollectionJobRequest request)
  {
    _request = request;
  }

  private static string GetImageBase64(Int64 photoId)
  {
    var photos = PhotoFs.Instance.PhotoDb.GetPhotosById(photoId);
    if (photos.Count != 1)
    {
      throw new ArgumentException("Cannot find photo " + photoId);
    }

    var photo = photos[0];

    var folder = PhotoFs.Instance.GetFolderInfo(photo.folderId);
    var srcPath = Path.GetFullPath(photo.fileName + photo.fileExt, folder.path);
    if (FileImporter.IsVideoFile(photo.fileExt))
    {
      throw new ArgumentException("Cannot process video " + photo.fileName);
    }

    using (var srcStm = System.IO.File.OpenRead(srcPath))
    {
      srcStm.Position = 0;
      using (var image = new MagickImage(srcStm))
      {
        image.Resize(1024, 0);
        image.Format = MagickFormat.Jpg;
        image.Quality = 100;

        using (var destStm = new MemoryStream())
        {
          image.Write(destStm);
          destStm.Position = 0;
          var dest = destStm.ToArray();
          return System.Convert.ToBase64String(dest);
        }
      }
    }
  }

  private class Comparer : IComparer<Tuple<Int64, double>>
  {
    public int Compare(Tuple<long, double>? x, Tuple<long, double>? y)
    {
      return Math.Sign(x.Item1 - x.Item2);
    }
  }

  public static async Task<IEnumerable<CollectionItem>> TextSearch(TextSearchRequest? request)
  {
    try
    {
      var itemMap = new HashSet<Int64>();

      List<Tuple<Int64, byte[]>> collItems;
      if (request.collKind != "all")
      {
        //collItems = PhotoFs.Instance.GetCollectionItems(request.collId);
        return null;
      }
      else
      {

        //collItems = PhotoFs.Instance.PhotoDb.GetLibraryItems();
        collItems = PhotoFs.Instance.PhotoDb.GetLibraryAltTextEmbedding();
      }

      var rankedItems = new List<Tuple<Int64, double>>();
      var filteredItems = new List<CollectionItem>();
      using (var client = new HttpClient())
      {
        var searchEmb = await ComputeTextEmbedding(client, request.search);

        foreach (var item in collItems)
        {
          var itemEmb = DeserializeTextEmbedding(item.Item2);
          var sim = GetCosineSimilarity(itemEmb, searchEmb);
          rankedItems.Add(new Tuple<long, double>(item.Item1, sim));
        }

        rankedItems.Sort((x, y) =>
        {
          return Math.Sign(y.Item2 - x.Item2);
        });
        return rankedItems.Select(x => new CollectionItem() { photoId = x.Item1, updateDt = DateTime.UtcNow.ToString("o") }).Take(100);

        // foreach (var item in collItems)
        // {
        //   itemMap.Add(item.photoId);
        // }

        // var searchItems = PhotoFs.Instance.PhotoDb.SearchAltText(request.search);
        // var filteredItems = new List<CollectionItem>();
        // foreach (var item in searchItems)
        // {
        //   if (!itemMap.Contains(item))
        //   {
        //     continue;
        //   }
        //   filteredItems.Add(new CollectionItem() { photoId = item });
        // }
      }
      return filteredItems;
    }
    catch (Exception e)
    {
      Console.WriteLine("TextSearch: failed " + e.Message);
      return new CollectionItem[0];
    }
  }

  private static double GetCosineSimilarity(double[] V1, double[] V2)
  {
    int N = 0;
    N = (V2.Length < V1.Length) ? V2.Length : V1.Length;
    double dot = 0.0d;
    double mag1 = 0.0d;
    double mag2 = 0.0d;
    for (int n = 0; n < N; n++)
    {
      dot += V1[n] * V2[n];
      mag1 += Math.Pow(V1[n], 2);
      mag2 += Math.Pow(V2[n], 2);
    }

    return dot / (Math.Sqrt(mag1) * Math.Sqrt(mag2));
  }
}
