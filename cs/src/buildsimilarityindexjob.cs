using System.Buffers.Text;
using System.Text;
using System.Text.Json;
using ImageMagick;
using kouki2.Controllers;
using Shipwreck.Phash;

public class BuildSimilarityIndexJob : IJob
{
  private bool _completed = false;
  private ProcessCollectionStatusResponse _status = new ProcessCollectionStatusResponse();
  private ProcessCollectionJobRequest _request;

  public bool Completed => _completed;

  public object Status => _status;

  public BuildSimilarityIndexJob(ProcessCollectionJobRequest request)
  {
    _request = request;
  }

  public async void Run()
  {
    _status.result = ResultResponse.Processing;

    List<PhotoIds> items = PhotoFs.Instance.PhotoDb.GetLibraryPhotoIds();
    Dictionary<string, Int64> duplicates = new Dictionary<string, long>();
    PhotoIds prevIds = null;
    Int64 dupPhotos = 0;
    Int64 simPhotos = 0;

    foreach (var item in items)
    {
      _status.processedFiles++;

      if (duplicates.TryGetValue(item.hash, out var id))
      {
        item.originalId = id;
        PhotoFs.Instance.PhotoDb.UpdatePhoto(new UpdatePhotoRequest()
        {
          hash = item.hash,
          originalId = id,
          originalCorrelation = 1.0
        });
        dupPhotos++;
        continue;
      }
      duplicates.Add(item.hash, item.id);

      if (prevIds != null)
      {
        double correlation = ComputeCorrelation(prevIds, item);
        if (correlation >= 0.9)
        {
          item.originalId = id;
          item.originalCorrelation = correlation;
          PhotoFs.Instance.PhotoDb.UpdatePhoto(new UpdatePhotoRequest()
          {
            hash = item.hash,
            originalId = id,
            originalCorrelation = correlation
          });
          simPhotos++;
          continue;
        }
      }

      prevIds = item;
    }

    Console.WriteLine($"BuildSimilarityIndexJob dup:{dupPhotos} sim:{simPhotos}");

    _status.result = ResultResponse.Done;
    _completed = true;
  }

  private double ComputeCorrelation(PhotoIds left, PhotoIds right)
  {
    if (left.phash == null || right.phash == null)
    {
      return -1;
    }
    else
    {
      return CrossCorrelation.GetCrossCorrelation(left.phash, right.phash);
    }
  }
}
