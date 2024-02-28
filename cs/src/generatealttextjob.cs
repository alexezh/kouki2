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

    var items = PhotoFs.Instance.GetCollectionItems(_request.collId);

    using (var client = new HttpClient())
    {
      foreach (var item in items)
      {
        try
        {
          await ProcessItem(client, item.photoId);
          this._status.processedFiles++;
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

  private async Task<bool> ProcessItem(HttpClient client, Int64 imageId)
  {
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

      await ComputeTextEmbedding(client, imageId, responseObj.content);
    }

    return true;
  }

  private byte[] SerializeEmbedding(double[] array)
  {
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
  }

  private async Task<bool> ComputeTextEmbedding(HttpClient client, Int64 photoId, string text)
  {
    var request = new ComputeTextEmbeddingRequest() { text = text };
    var requestData = JsonSerializer.Serialize(request);
    using (var response = await client.PostAsync("http://127.0.0.1:5000/api/textembedding",
      new StringContent(requestData, Encoding.UTF8,
                                    "application/json")))
    {
      var responseText = await response.Content.ReadAsStringAsync();
      var responseObj = JsonSerializer.Deserialize<ComputeTextEmbeddingResponse>(responseText);
      //Console.WriteLine(responseObj?.numpy_data?.Length);
      var emb = SerializeEmbedding(responseObj.numpy_data);
      PhotoFs.Instance.PhotoDb.UpdatePhotoAltTextEmbedding(photoId, emb);
    }

    return true;
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

  public static IEnumerable<CollectionItem> TextSearch(TextSearchRequest? request)
  {
    try
    {
      var itemMap = new HashSet<Int64>();

      IEnumerable<CollectionItem> collItems;
      if (request.collKind != "all")
      {
        collItems = PhotoFs.Instance.GetCollectionItems(request.collId);
      }
      else
      {
        collItems = PhotoFs.Instance.GetLibraryItems();
      }

      foreach (var item in collItems)
      {
        itemMap.Add(item.photoId);
      }

      var searchItems = PhotoFs.Instance.PhotoDb.SearchAltText(request.search);
      var filteredItems = new List<CollectionItem>();
      foreach (var item in searchItems)
      {
        if (!itemMap.Contains(item))
        {
          continue;
        }
        filteredItems.Add(new CollectionItem() { photoId = item });
      }
      return filteredItems;
    }
    catch (Exception e)
    {
      Console.WriteLine("TextSearch: failed " + e.Message);
      return new CollectionItem[0];
    }
  }
}
