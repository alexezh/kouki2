using System.Buffers.Text;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using ImageMagick;
using kouki2.Controllers;
using Microsoft.Extensions.ObjectPool;
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

    List<MinPhotoEntry> items = PhotoFs.Instance.PhotoDb.GetMinPhotoEntries((command, fields) =>
    {
      command.CommandText = $"SELECT {fields} FROM Photos ORDER BY originalDt2 DESC";
    });
    Dictionary<string, MinPhotoEntry> duplicateMap = new Dictionary<string, MinPhotoEntry>();
    Int64 dupPhotos = 0;
    Int64 simPhotos = 0;

    // run throuhg items and update duplicates by hash
    // then run similarities as a chain; possibly updating original for dups
    foreach (var item in items)
    {
      _status.processedFiles++;

      if (item.id == 20331)
      {
        Console.WriteLine("Hello++");
      }

      if (duplicateMap.TryGetValue(item.hash, out var dup))
      {
        item.originalId = dup.id;
        PhotoFs.Instance.PhotoDb.UpdatePhoto(new UpdatePhotoRequest()
        {
          hash = item.hash,
          originalId = item.originalId,
          originalCorrelation = 1.0
        });
        dupPhotos++;
        continue;
      }
      else if (item.originalId != 0)
      {
        item.originalId = 0;
        PhotoFs.Instance.PhotoDb.UpdatePhoto(new UpdatePhotoRequest()
        {
          hash = item.hash,
          originalId = 0,
          originalCorrelation = 1.0
        });
      }

      duplicateMap.Add(item.hash, item);
    }

    MinPhotoEntry prevItem = null;
    List<MinPhotoEntry> currentBucket = new List<MinPhotoEntry>();
    foreach (var item in items)
    {
      if (item.id == 19900)
      {
        Console.WriteLine("Hello++");
      }

      // check if previous linked to bucket
      if (prevItem != null)
      {
        double correlation = ComputeCorrelation(prevItem, item);
        if (correlation >= 0.9)
        {
          if (currentBucket.Count == 0)
          {
            currentBucket.Add(prevItem);
          }
          currentBucket.Add(item);
          item.originalCorrelation = correlation;
          // item.originalId = id;
          // PhotoFs.Instance.PhotoDb.UpdatePhoto(new UpdatePhotoRequest()
          // {
          //   hash = item.hash,
          //   originalId = id,
          //   originalCorrelation = correlation
          // });
          simPhotos++;
          continue;
        }
        else
        {
          if (currentBucket.Count > 0)
          {
            WriteSimilarityBucket(currentBucket, duplicateMap);
            currentBucket.Clear();
          }
        }
      }

      prevItem = item;
    }

    Console.WriteLine($"BuildSimilarityIndexJob dup:{dupPhotos} sim:{simPhotos}");

    _status.result = ResultResponse.Done;
    _completed = true;
  }

  private void WriteSimilarityBucket(List<MinPhotoEntry> bucket, Dictionary<string, MinPhotoEntry> duplicateMap)
  {
    var bestIdx = 0;
    for (var idx = 1; idx < bucket.Count; idx++)
    {
      if (bucket[idx].fileSize > bucket[bestIdx].fileSize)
      {
        bestIdx = idx;
      }
    }

    int origCount = bucket.Count;
    for (var idx = 0; idx < origCount; idx++)
    {
      var item = bucket[idx];
      // at this point, if bucket element has original ID, it points to dup
      // we want to include dup into bucket. We might already have it; but it does not matter
      if (item.originalId != 0)
      {
        if (duplicateMap.TryGetValue(item.hash, out var dup))
        {
          if (item.id != dup.id)
          {
            bucket.Add(dup);
          }
        }
        else
        {
          Console.WriteLine("WriteSimilarityBucket: cannot find dup");
        }
      }
    }

    var bestItem = bucket[bestIdx];
    if (bestItem.id == 12694)
    {
      Console.WriteLine("Hello");
    }

    for (var idx = 0; idx < bucket.Count; idx++)
    {
      if (idx != bestIdx)
      {
        var item = bucket[idx];

        item.originalId = bestItem.id;
        PhotoFs.Instance.PhotoDb.UpdatePhoto(new UpdatePhotoRequest()
        {
          id = item.id,
          originalId = item.originalId,
          originalCorrelation = item.originalCorrelation
        });
      }
    }
  }

  private double ComputeCorrelation(MinPhotoEntry left, MinPhotoEntry right)
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
