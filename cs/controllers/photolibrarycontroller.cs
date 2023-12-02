using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace kouki2.Controllers;


/// <summary>
/// manages list of source folders
/// creates list of output folders which contain links or different versions
/// </summary>
public class PhotoLibraryController
{
  public void AddSourceFolder(string dir, string name)
  {
    PhotoFs.Instance.AddSourceFolder(new FolderName(dir));
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

  // get string as resource
  [HttpGet]
  public IActionResult GetImage(string id)
  {
    // for now we only accept * pattern
    return PhotoFs.Instance.GetImageFile(id);
  }

  [HttpGet]
  public IActionResult GetThumbnail(string id)
  {
    // for now we only accept * pattern
    return PhotoFs.Instance.GetThumbnailFile(id);
  }

  /// <summary>
  /// ensures that source folder is in sync with DB
  /// </summary>
  public void SyncSourceFolder()
  {

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