
using System.Numerics;
using ImageMagick;
using Shipwreck.Phash;
using Shipwreck.Phash.Imaging;

public class ImportFolderRequest
{
  public string folder { get; set; }
  public Int64 importCollection { get; set; }
}

public class ImportFolderResponse : BackgroundJobResponse
{
}

public class RescanFolderRequest
{
  public Int64 folderId { get; set; }
}

public class RescanFolderResponse : BackgroundJobResponse
{
}

public class ExportPhotosRequest
{
  public string path { get; set; }
  /// <summary>
  /// original or jpeg
  /// </summary>
  public string format { get; set; }
  public Int64[] photos { get; set; }
  public Int64 exportCollection { get; set; }
}

public class ExportPhotosResponse : BackgroundJobResponse
{
}

public class ExportJobResponse
{
  public int exportedFiles { get; set; }
  public int skippedFiles { get; set; }
  public string result { get; set; }
}

public class ExportJob : IJob
{
  private bool _completed = false;
  private ExportJobResponse _status = new ExportJobResponse();
  private ExportPhotosRequest _request;

  public bool Completed => _completed;

  public object Status => _status;


  public void Run()
  {
    _status.result = "Processing";

    Exporter.ExportPhotos(
      PhotoFs.Instance.PhotoDb,
      PhotoFs.Instance.ExportPath,
      _request,
      (ExportStatus status) =>
    {
      _status.exportedFiles = status.Exported;
      _status.skippedFiles = status.Skipped;
    });

    _status.result = "Done";
    _completed = true;
  }

  public ExportJob(ExportPhotosRequest request)
  {
    _request = request;
  }
}

public class ExportStatus
{
  public int Exported;
  public int Skipped;
}

public class Exporter
{

  internal static void ExportPhotos(
    PhotoDb photoDb,
    string exportPath,
    ExportPhotosRequest request,
    Action<ExportStatus> progress)
  {
    var status = new ExportStatus();

    try
    {
      var folderNames = new Dictionary<Int64, string>();
      var exportFolder = Path.GetFullPath(request.path, exportPath);
      if (!exportFolder.StartsWith(exportPath))
      {
        throw new ArgumentException("request path is relative");
      }
      Directory.CreateDirectory(exportFolder);

      foreach (var id in request.photos)
      {
        try
        {
          var photos = photoDb.GetPhotosById(id);
          if (photos.Count != 1)
          {
            throw new ArgumentException("Cannot find photo " + id);
          }

          var photo = photos[0];

          if (!folderNames.TryGetValue(photo.folderId, out var folderPath))
          {
            var folder = photoDb.GetFolder(photo.folderId);
            folderPath = folder.path;
            folderNames.Add(folder.id, folder.path);
          }

          var targetPath = Path.GetFullPath(photo.fileName + photo.fileExt, folderPath);

          var runPhash = true;

          if (runPhash && request.format == "jpeg" && !(photo.format == (int)MagickFormat.Jpeg || photo.format == (int)MagickFormat.Jpg))
          {
            var destPath = Path.GetFullPath(photo.fileName + ".jpg", exportFolder);
            CopyJpeg(destPath, targetPath);
          }
          else
          {
            var linkPath = Path.GetFullPath(photo.fileName + photo.fileExt, exportFolder);
            File.CreateSymbolicLink(linkPath, targetPath);
          }
          status.Exported++;
        }

        catch (Exception e)
        {
          status.Skipped++;
          Console.WriteLine("Failed process photo: " + e.Message);
        }

        progress(status);
      }

      if (request.exportCollection != 0)
      {
        var now = DateTime.Now;
        foreach (var photo in request.photos)
        {
          photoDb.AddCollectionItem(request.exportCollection, photo, now.ToBinary());
        }

        Console.WriteLine("Export collection " + request.exportCollection);
      }
    }
    catch (Exception e)
    {
      Console.Error.WriteLine("Failed to export: " + e.Message);
    }
  }

  private static void CopyJpeg(string destPath, string srcPath)
  {
    using (var srcStm = File.OpenRead(srcPath))
    {
      srcStm.Position = 0;
      using (var image = new MagickImage(srcStm))
      {
        image.Format = MagickFormat.Jpg;
        image.Quality = 100;

        using (var destStm = File.OpenWrite(destPath))
        {
          image.Write(destStm);
        }
      }
    }
  }
}

