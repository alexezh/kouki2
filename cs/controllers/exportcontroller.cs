using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace kouki2.Controllers;


/// <summary>
/// manages list of source folders
/// creates list of output folders which contain links or different versions
/// </summary>
public class ExportController : Controller
{

  // get string as resource
  [HttpPost]
  public async Task<UpdatePhotoResponse> ExportPhotos(string id)
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<UpdatePhotoRequest[]>(content);

      PhotoFs.Instance.UpdatePhotos(request);

      return new UpdatePhotoResponse() { Error = "ok" };
    }
  }
}
