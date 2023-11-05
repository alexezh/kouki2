using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

public class ProjectProps
{
  public string id { get; set; }
}

public class WireCreateProjectRequest
{
  public string name { get; set; }
}

public class WireCreateProjectResponse
{
  public string result { get; set; }
  public string id { get; set; }
}

public class ProjectCollection
{
  public static ProjectCollection Instance = new ProjectCollection();
  private const string DemoProjectId = "7fa84179-dc58-4939-8678-03370fd137f3";
  private Dictionary<string, Project> _projects = new Dictionary<string, Project>();

  public void Initialize()
  {
    CreateDemo();
  }

  private void CreateDemo()
  {
    if (ProjectDbStatics.Exists(DemoProjectId))
    {
      _projects.Add(DemoProjectId, Project.Load(DemoProjectId));
      return;
    }

    UserDbStatics.CreateUserDb();

    // first create DB
    ProjectDbStatics.CreateProjectDb(DemoProjectId);
    _projects.Add(DemoProjectId, Project.Load(DemoProjectId));
  }

  internal Project GetProject(string id)
  {
    Project prj;
    if (id == null)
    {
      return null;
    }

    if (_projects.TryGetValue(id, out prj))
    {
      return prj;
    }

    // load project on demand
    prj = Project.Load(id);
    _projects.TryAdd(id, prj);

    return prj;
  }

  internal Project CreateProject(WireCreateProjectRequest request)
  {
    var id = Guid.NewGuid().ToString("D");
    ProjectDbStatics.CreateProjectDb(id);

    var prj = Project.Load(id);
    _projects.TryAdd(id, prj);
    return prj;
  }
}
