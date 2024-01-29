using System.Collections.Concurrent;
using Microsoft.AspNetCore.Http.HttpResults;

public class UpdateString
{
  string val;
}

public class ResultResponse
{
  public const string Ok = "Ok";
  public const string Done = "Done";
  public const string Failed = "Failed";
  public const string NotFound = "NotFound";
  public const string Processing = "Processing";

  public string result { get; set; }
  public string message { get; set; }
}

public class JobResponse : ResultResponse
{
  public string jobId { get; set; }
}

public class GetJobStatusResponse : ResultResponse
{
}

public class CollectionItem
{
  public Int64 photoId { get; set; }
  public string updateDt { get; set; }
}

public interface IJob
{
  void Run();
  bool Completed { get; }
  object Status { get; }
}

public class JobRunner
{
  public static JobRunner Instance = new JobRunner();

  private ConcurrentDictionary<string, IJob> _jobs = new ConcurrentDictionary<string, IJob>();

  public string RunJob(IJob job)
  {
    var id = Guid.NewGuid().ToString();
    _jobs.TryAdd(id, job);
    Task.Run(() =>
    {
      job.Run();
    });
    return id;
  }
  public object GetJobInfo(string id)
  {
    if (!_jobs.TryGetValue(id, out var job))
    {
      return null;
    }

    return job.Status;
  }
}