using System.Text;
using System.Text.Json;
using ImageMagick;
using Microsoft.AspNetCore.Mvc;
using Org.BouncyCastle.Asn1.Ocsp;
using Shipwreck.Phash;

namespace kouki2.Controllers;

public class BuildPHashRequest
{
  public Int64[] photos { get; set; }
  public Int64 folderId { get; set; }
}

public class BuildPHashResponse : ResultResponse
{
  public string jobId { get; set; }
}

public class BuildPHashJobResponse
{
  public int processedFiles { get; set; }
  public int skippedFiles { get; set; }
  public string result { get; set; }
}

public class BuildPHashJob : IJob
{
  private bool _completed = false;
  private BuildPHashJobResponse _status = new BuildPHashJobResponse();
  private BuildPHashRequest _request;

  public bool Completed => _completed;

  public object Status => _status;


  public void Run()
  {
    _status.result = "Processing";

    Int64[] photos;
    if (_request.photos != null)
    {
      photos = _request.photos;
    }
    else
    {
      photos = PhotoFs.Instance.PhotoDb.GetPhotosByFolder(_request.folderId).Select(x => x.photoId).ToArray();
    }

    foreach (var photo in photos)
    {
      try
      {
        var digest = ComputePHash(photo);
        PhotoFs.Instance.PhotoDb.AddDigest(photo, digest.Coefficients);
        _status.processedFiles++;
      }
      catch (Exception e)
      {
        Console.Error.WriteLine("Failed process. Exception:" + e.Message);
      }
    }

    // var digest0 = digests[0];
    // var correlation = new List<float>();
    // foreach (var digest in digests)
    // {
    //   correlation.Add(CrossCorrelation.GetCrossCorrelation(digest0.Coefficients, digest.Coefficients));
    // }

    _status.result = "Done";
    _completed = true;
  }

  public BuildPHashJob(BuildPHashRequest request)
  {
    _request = request;
  }

  private static Digest ComputePHash(MagickImage image)
  {
    var pixels = image.GetPixels();
    var bytes = pixels.ToByteArray("RGB");
    var bitmap = new ByteImage(image.Width, image.Height, bytes);
    var hash = ImagePhash.ComputeDigest(bitmap.ToLuminanceImage());
    return hash;
  }

  private static Digest ComputePHash(Int64 photoId)
  {
    var photos = PhotoFs.Instance.PhotoDb.GetPhotosById(photoId);
    if (photos.Count != 1)
    {
      throw new ArgumentException("Cannot find photo " + photoId);
    }

    var photo = photos[0];

    var folder = PhotoFs.Instance.PhotoDb.GetFolder(photo.folderId);
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

/// <summary>
/// manages list of source folders
/// creates list of output folders which contain links or different versions
/// </summary>
public class SimilarityController : Controller
{


  // get string as resource
  [HttpPost]
  public async Task<BuildPHashResponse> BuildPHash()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<BuildPHashRequest>(content);

      var id = JobRunner.Instance.RunJob(new BuildPHashJob(request));

      return new BuildPHashResponse() { jobId = id, result = "Ok" };
    }
  }
}
