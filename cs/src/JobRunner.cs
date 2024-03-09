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

  public static async Task<T> CatchAll<T>(Func<Task<T>> func) where T : ResultResponse, new()
  {
    try
    {
      return await func();
    }
    catch (Exception e)
    {
      return new T()
      {
        result = Failed,
        message = e.Message
      };
    }
  }
}

public class JobResponse : ResultResponse
{
  public string jobId { get; set; }
}

public class GetJobStatusResponse : ResultResponse
{
}

public class ProcessCollectionJobRequest
{
  public string cmd { get; set; }
  public string collKind { get; set; }
  public Int64 collId { get; set; }
  public bool forceUpdate { get; set; }
}

public class ProcessCollectionStatusResponse : GetJobStatusResponse
{
  public Int64 processedFiles { get; set; }
  public Int64 skippedFiles { get; set; }
}

public class CollectionItem
{
  public Int64 photoId { get; set; }
  public string updateDt { get; set; }
}

public class PhotoIds
{
  public Int64 id;
  public string hash;
  public Int64 stackId;
  public Int64 originalId;
  public double originalCorrelation;
  public byte[] phash;
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