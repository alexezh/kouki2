using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace kouki2.Controllers;

public class JobController : Controller
{
  public static void RegisterRoutes(WebApplication app)
  {
    app.MapControllerRoute(
    name: "GetJobStatus",
    pattern: "/api/{controller=Job}/{action=GetJobStatus}/{id}");
  }

  [HttpGet]
  public object GetJobStatus(string id)
  {
    return JobRunner.Instance.GetJobInfo(id);
  }
}
