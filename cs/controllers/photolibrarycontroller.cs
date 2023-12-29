using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace kouki2.Controllers;


/// <summary>
/// manages list of source folders
/// creates list of output folders which contain links or different versions
/// </summary>
public class PhotoLibraryController : Controller
{
  [HttpPost]
  public async Task<AddFolderResponse> AddSourceFolder()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<AddFolderRequest>(content);

      var id = JobRunner.Instance.RunJob(new ImportJob(request.folder));

      return new AddFolderResponse() { result = "Ok", jobId = id };
    }
  }

  [HttpPost]
  public async Task<AddFolderResponse> RescanSourceFolder()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<RescanFolderRequest>(content);

      var id = JobRunner.Instance.RunJob(new RescanJob(request.folderId));

      return new AddFolderResponse() { result = "Ok", jobId = id };
    }
  }

  [HttpPost]
  public async Task<ResultResponse> CheckSourceFolder()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<AddFolderRequest>(content);

      bool exists = PhotoFs.Instance.CheckSourceFolder(new FolderName(request.folder));

      return new ResultResponse() { result = (exists) ? "Ok" : "NotFound" };
    }
  }

  [HttpGet]
  public IEnumerable<FolderEntry> GetSourceFolders()
  {
    return PhotoFs.Instance.GetSourceFolders();
  }

  [HttpGet]
  public IEnumerable<PhotoEntry> GetFolder(Int64 id)
  {
    return PhotoFs.Instance.GetFolder(id);
  }

  [HttpGet]
  public IEnumerable<PhotoEntry> GetCollection(string id)
  {
    return PhotoFs.Instance.GetCollection(id);
  }

  [HttpGet]
  public IEnumerable<CollectionEntry> GetCollections()
  {
    return PhotoFs.Instance.GetCollections();
  }

  // get string as resource
  [HttpGet]
  public IActionResult GetImage(string id)
  {
    // for now we only accept * pattern
    return PhotoFs.Instance.GetImageFile(id);
  }

  // get string as resource
  [HttpPost]
  public async Task<UpdatePhotoResponse> UpdatePhotos(string id)
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<UpdatePhotoRequest[]>(content);

      PhotoFs.Instance.UpdatePhotos(request);

      return new UpdatePhotoResponse() { error = "ok" };
    }
  }

  [HttpGet]
  public IActionResult GetThumbnail(string id)
  {
    // for now we only accept * pattern
    return PhotoFs.Instance.GetThumbnailFile(id);
  }
}

// public class ListFiles : Controller
// {
//   [HttpPost]
//   public async Task<WireLoginResponse> Login()
//   {
//     using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
//     {
//       string content = await reader.ReadToEndAsync();
//       WireLoginRequest request = JsonSerializer.Deserialize<WireLoginRequest>(content);

//       var session = UserDbStatics.LoginUser(request.name, request.pwd);

//       if (session == null)
//       {
//         return new WireLoginResponse() { url = null, session = null };
//       }
//       else
//       {
//         return new WireLoginResponse() { url = "/digshell.html", session = session };
//       }
//     }
//   }
// }