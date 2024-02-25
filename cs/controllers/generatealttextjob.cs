using System.Buffers.Text;
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
        }
        catch (Exception e)
        {
          // _status.result = ResultResponse.Failed;
          // _status.message = e.Message;
          // _completed = true;
          Console.WriteLine("AltText: failed to process");
        }
      }
    }
  }

  private async Task<bool> ProcessItem(HttpClient client, Int64 imageId)
  {
    var imageData = GetImageBase64(imageId);

    var request = new LLamaRequest()
    {
      prompt = "Detailed image analysis dialogue.\nUSER:[img-1] Provide a brief, concise description of this image, highlighting only the most essential elements in a few words.\nASSISTANT:",
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
      }
    }

    _status.result = ResultResponse.Done;
    _completed = true;

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
}
