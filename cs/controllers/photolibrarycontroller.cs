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

  }

  public List<string> GetSourceFolders()
  {
    return null;
  }

  /// <summary>
  /// ensures that source folder is in sync with DB
  /// </summary>
  public void SyncSourceFolder()
  {

  }

  public void Directory(string dir)
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