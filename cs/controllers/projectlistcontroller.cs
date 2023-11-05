using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace barksrv.Controllers;

public class ProjectListController : Controller
{
  [HttpGet]
  public JsonResult ListProjects()
  {
    // Project prj = ProjectCollection.Instance.GetProject(id);
    // if (prj == null)
    // {
    //   return Json("Unknown world");
    // }
    // return Json(prj.ToWire());
    throw new NotImplementedException();
  }

  [HttpPost]
  public async Task<WireCreateProjectResponse> CreateProject()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<WireCreateProjectRequest>(content);

      Project prj = ProjectCollection.Instance.CreateProject(request);
      if (prj == null)
      {
        return new WireCreateProjectResponse() { result = "cannot create project" };
      }

      return new WireCreateProjectResponse() { result = "success", id = prj.id };
    }
  }
}