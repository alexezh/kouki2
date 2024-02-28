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
  internal static void RegisterRoutes(WebApplication app)
  {
    app.MapControllerRoute(
        name: "ExportPhotos",
        pattern: "/api/{controller=Export}/{action=ExportPhotos}");
  }

  // get string as resource
  [HttpPost]
  public async Task<ExportPhotosResponse> ExportPhotos()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<ExportPhotosRequest>(content);

      //PhotoFs.Instance.ExportPhotos(request);
      var id = JobRunner.Instance.RunJob(new ExportJob(request));

      return new ExportPhotosResponse() { result = ResultResponse.Ok, jobId = id };
    }
  }
}
