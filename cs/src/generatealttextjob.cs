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
  public string model { get; set; }
  public string prompt { get; set; }
  public string[] images { get; set; }
  public bool stream { get; set; }
}

public class LLamaEmbeddingResponse
{
  public double[] embedding { get; set; }

  public static LLamaRequest BuildRequest(string text)
  {
    return new LLamaRequest()
    {
      model = "llama3.2-vision:latest",
      //       prompt = @"Detailed image analysis dialogue.
      // USER:[img-1] Provide a brief, concise description of this image, highlighting only the most essential elements in a few words.
      // ASSISTANT:",
      prompt = text,
      images = null,
      stream = false
    };
  }

  public static async Task<double[]> SendRequest(HttpClient client, string text)
  {
    var request = BuildRequest(text);

    var requestData = JsonSerializer.Serialize(request);
    using (var response = await client.PostAsync("http://localhost:11434/api/embeddings", new StringContent(requestData)))
    {
      var responseText = LLamaGenerateResponse.trimText(await response.Content.ReadAsStringAsync());
      var responseObj = JsonSerializer.Deserialize<LLamaEmbeddingResponse>(responseText);

      return responseObj.embedding;
    }
  }
}

public class LLamaGenerateResponse
{
  public string response { get; set; }

  public static string trimText(string s)
  {
    if (s.Length > 0)
    {
      var i = s.Length;
      for (; i > 0; i--)
      {
        if (s[i - 1] == '}')
        {
          break;
        }
      }
      if (i != s.Length)
      {
        s = s.Substring(0, i);
      }
    }

    return s;
  }
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

    IEnumerable<CollectionItem> items = PhotoFs.Instance.PhotoDb.GetCollectionItemsByKind(_request.collKind, _request.collId);

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
    forceUpdate = true;

    if (!forceUpdate)
    {
      var alttext = PhotoFs.Instance.PhotoDb.GetPhotoAltText(imageId);
      if (alttext != null)
      {
        return false;
      }
    }

    bool updateAlt = false;

    // if (responseObj.response != null)
    // {
    //   PhotoFs.Instance.PhotoDb.UpdatePhotoAltText(imageId, responseObj.response);
    //   PhotoFs.Instance.PhotoDb.UpdateAltText(imageId, responseObj.response);
    // }
    string altText;
    if (updateAlt)
    {
      altText = await UpdateAltText(client, imageId);
    }
    else
    {
      altText = PhotoFs.Instance.PhotoDb.GetPhotoAltText(imageId);
    }

    var emb = await LLamaEmbeddingResponse.SendRequest(client, altText);
    var embBuf = SerializeEmbedding(emb);
    PhotoFs.Instance.PhotoDb.UpdatePhotoAltTextEmbedding(imageId, embBuf);

    return true;
  }

  private static async Task<string> UpdateAltText(HttpClient client, Int64 imageId)
  {
    Console.WriteLine("GenerateAltText item: " + imageId);
    var imageData = GetImageBase64(imageId);

    var request = new LLamaRequest()
    {
      model = "llama3.2-vision:latest",
      //       prompt = @"Detailed image analysis dialogue.
      // USER:[img-1] Provide a brief, concise description of this image, highlighting only the most essential elements in a few words.
      // ASSISTANT:",
      prompt = @"Provide a brief, concise description of this image, highlighting only the most essential elements in a few words followed by a thorough analysis of this image, including all elements, colors, and any noticeable features",
      images = new string[1] { imageData },
      stream = false
    };

    var requestData = JsonSerializer.Serialize(request);
    using (var response = await client.PostAsync("http://localhost:11434/api/generate", new StringContent(requestData)))
    {
      var responseText = LLamaGenerateResponse.trimText(await response.Content.ReadAsStringAsync());

      //Console.WriteLine(responseText);
      var responseObj = JsonSerializer.Deserialize<LLamaGenerateResponse>(responseText);
      if (responseObj.response != null)
      {
        PhotoFs.Instance.PhotoDb.UpdatePhotoAltText(imageId, responseObj.response);
        PhotoFs.Instance.PhotoDb.UpdateAltText(imageId, responseObj.response);
      }

      return responseObj.response;
    }
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

      var startDt = (request.startDt != null) ? DateTime.Parse(request.startDt).Ticks : 0;
      List<Tuple<Int64, byte[]>> collItems;
      if (request.collKind == "all")
      {
        collItems = PhotoFs.Instance.PhotoDb.GetAltTextEmbedding((command) =>
        {
          command.CommandText = $"select Photos.alttexte, id from Photos where originalDt2 > {startDt} and alttexte is not null;";
        });
      }
      else if (request.collKind == "favorite")
      {
        collItems = PhotoFs.Instance.PhotoDb.GetAltTextEmbedding((command) =>
        {
          command.CommandText = $"select Photos.alttexte, id from Photos where originalDt2 > {startDt} and fav > 0 and alttexte is not null;";
        });
      }
      else
      {
        return null;
      }

      var rankedItems = new List<Tuple<Int64, double>>();
      var filteredItems = new List<CollectionItem>();
      using (var client = new HttpClient())
      {
        var searchEmb = await LLamaEmbeddingResponse.SendRequest(client, request.search);

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

        Console.WriteLine($"TextSearch: total:{collItems.Count} top:{rankedItems[0].Item1} rank: {rankedItems[0].Item2}");

        return rankedItems.Select(x => new CollectionItem()
        {
          photoId = x.Item1,
          updateDt = DateTime.UtcNow.ToString("o")
        }).Take(100);

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
