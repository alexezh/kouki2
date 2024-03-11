using ImageMagick;
using kouki2.Controllers;
using Shipwreck.Phash;

public class BuildPHashJob : IJob
{
  private bool _completed = false;
  private ProcessCollectionStatusResponse _status = new ProcessCollectionStatusResponse();
  private ProcessCollectionJobRequest _request;

  public bool Completed => _completed;

  public object Status => _status;


  public async void Run()
  {
    _status.result = ResultResponse.Processing;

    var photoObjs = PhotoFs.Instance.PhotoDb.GetMinPhotoEntriesByKind(_request.collKind, _request.collId);

    var pending = new List<Task>();
    foreach (var photo in photoObjs)
    {
      // if (photo.phash != null)
      // {
      //   continue;
      // }

      pending.Add(Task.Run(() =>
      {
        try
        {
          var digest = ComputePHash(photo.id);
          PhotoFs.Instance.PhotoDb.UpdatePhotoPHash(photo.id, digest.Coefficients);
          _status.processedFiles++;
        }
        catch (Exception e)
        {
          Console.Error.WriteLine("Failed process. Exception:" + e.Message);
        }
      }));

      if (pending.Count == 1)
      {
        await Task.WhenAll(pending.ToArray());
        pending.Clear();
      }
    }

    // var digest0 = digests[0];
    // var correlation = new List<float>();
    // foreach (var digest in digests)
    // {
    //   correlation.Add(CrossCorrelation.GetCrossCorrelation(digest0.Coefficients, digest.Coefficients));
    // }

    _status.result = ResultResponse.Done;
    _completed = true;
  }

  public BuildPHashJob(ProcessCollectionJobRequest request)
  {
    _request = request;
  }

  private static Digest ComputePHash(MagickImage image)
  {
    using (var pixels = image.GetPixels())
    {
      var bytes = pixels.ToByteArray("RGB");
      var bitmap = new ByteImage(image.Width, image.Height, image.Orientation, bytes);
      var hash = ImagePhash.ComputeDigest(bitmap.ToLuminanceImage());
      return hash;
    }
  }

  public static Digest ComputePHash(Int64 photoId)
  {
    var photos = PhotoFs.Instance.PhotoDb.GetPhotosById(photoId);
    if (photos.Count != 1)
    {
      throw new ArgumentException("Cannot find photo " + photoId);
    }

    var photo = photos[0];

    var folder = PhotoFs.Instance.GetFolderInfo(photo.folderId);
    var srcPath = Path.GetFullPath(photo.fileName + photo.fileExt, folder.path);

    using (var srcStm = System.IO.File.OpenRead(srcPath))
    {
      srcStm.Position = 0;
      using (var image = new MagickImage(srcStm))
      {
        return ComputePHash(image);
      }
    }
  }
}
