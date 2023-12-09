using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace kouki2.Controllers;

public class JobController : Controller
{
  [HttpGet]
  public object GetJobStatus(string id)
  {
    return JobRunner.Instance.GetJobInfo(id);
  }
}
