using System.Collections.Concurrent;

public class UpdateString
{
  string val;
}

public class ResultResponse
{
  public string result { get; set; }
}

public class BackgroundJobResponse
{
  public string jobId { get; set; }
  public string result { get; set; }
}

public class GetJobStatusResponse
{
  public string result { get; set; }
  public string message { get; set; }
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