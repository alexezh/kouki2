using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace barksrv.Controllers;

public class ProjectController : Controller
{
  [HttpPost]
  public async Task<WireGetStringsResponse> GetStrings(string id)
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      WireGetStringsRequest request = JsonSerializer.Deserialize<WireGetStringsRequest>(content);

      Project prj = ProjectCollection.Instance.GetProject(id);
      if (prj == null)
      {
        throw new ArgumentException("Unknown world");
      }

      if (request.keys != null)
      {
        return new WireGetStringsResponse() { values = prj.GetStrings(request.keys).ToArray() };
      }
      else
      {
        return new WireGetStringsResponse() { values = prj.GetStringsPattern(request.pattern).ToArray() };
      }
    }
  }

  [HttpPost]
  public async Task<string> SetStrings(string id)
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      WireString[] code = JsonSerializer.Deserialize<WireString[]>(content);

      Project prj = ProjectCollection.Instance.GetProject(id);
      if (prj == null)
      {
        throw new ArgumentException("Unknown world");
      }

      prj.SetStrings(code);
    }

    return "OK";
  }

  [HttpGet]
  public FileContentResult GetResource(string id)
  {
    var url = Request.Query["url"];
    if (url.Count == 0)
    {
      return null;
    }

    Project prj = ProjectCollection.Instance.GetProject(id);
    if (prj == null)
    {
      throw new ArgumentException("Unknown world");
    }

    var data = prj.GetResource(url[0]);

    return File(data, "image/png", "png");
  }


  [HttpPost]
  public async Task<WireGetDictResponse> GetDict(string id)
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<WireGetDictRequest>(content);

      Project prj = ProjectCollection.Instance.GetProject(id);
      if (prj == null)
      {
        throw new ArgumentException("Unknown world");
      }

      return new WireGetDictResponse() { fields = prj.GetDict(request.key, request.fields)?.ToArray() };
    }
  }

  [HttpPost]
  public async Task<string> SetDict(string id)
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<WireSetDictRequest>(content);

      Project prj = ProjectCollection.Instance.GetProject(id);
      if (prj == null)
      {
        throw new ArgumentException("Unknown world");
      }

      prj.SetDict(request.key, request.fields);
    }

    return "OK";
  }

  [HttpPost]
  public async Task<WireIncrementResponse> Increment(string id)
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<WireIncrementRequest>(content);

      Project prj = ProjectCollection.Instance.GetProject(id);
      if (prj == null)
      {
        throw new ArgumentException("Unknown world");
      }

      int idx = prj.Increment(request.key, request.count);
      return new WireIncrementResponse() { start = idx, count = request.count };
    }
  }
}