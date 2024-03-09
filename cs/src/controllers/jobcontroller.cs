using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace kouki2.Controllers;

public class JobController : Controller
{
  public static void RegisterRoutes(WebApplication app)
  {
    app.MapControllerRoute(
        name: "ProcessCollection",
        pattern: "/api/{controller=Job}/{action=ProcessCollection}");

    app.MapControllerRoute(
      name: "GetJobStatus",
      pattern: "/api/{controller=Job}/{action=GetJobStatus}/{id}");
  }

  [HttpGet]
  public object GetJobStatus(string id)
  {
    return JobRunner.Instance.GetJobInfo(id);
  }

  // get string as resource
  [HttpPost]
  public async Task<JobResponse> ProcessCollection()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<ProcessCollectionJobRequest>(content);

      string id;
      switch (request.cmd)
      {
        case "phash":
          id = JobRunner.Instance.RunJob(new BuildPHashJob(request));
          break;
        case "alttext":
          id = JobRunner.Instance.RunJob(new GenerateAltTextJob(request));
          break;
        case "similarity":
          id = JobRunner.Instance.RunJob(new BuildSimilarityIndexJob(request));
          break;
        default:
          return new JobResponse() { result = ResultResponse.Failed };
      }

      return new JobResponse() { jobId = id, result = ResultResponse.Ok };
    }
  }
}
