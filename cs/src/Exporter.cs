using ImageMagick;

public class ImportFolderResponse : JobResponse
{
}

public class RescanFolderRequest
{
  public Int64 folderId { get; set; }
}

public class RescanFolderResponse : JobResponse
{
}

public class ExportPhotosRequest
{
  public string path { get; set; }
  /// <summary>
  /// original or jpeg
  /// </summary>
  public string format { get; set; }
  public bool useSymLink { get; set; }
  public Int64[] photos { get; set; }
  public Int64 exportCollection { get; set; }
}

public class ExportPhotosResponse : JobResponse
{
}

public class ExportJobResponse : GetJobStatusResponse
{
  public int exportedFiles { get; set; }
  public int skippedFiles { get; set; }
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
    _status.result = ResultResponse.Processing;

    Exporter.ExportPhotos(
      PhotoFs.Instance,
      PhotoFs.Instance.ExportPath,
      _request,
      (ExportStatus status) =>
    {
      _status.exportedFiles = status.Exported;
      _status.skippedFiles = status.Skipped;
    });

    _status.result = ResultResponse.Done;
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
    PhotoFs photoFs,
    string exportPath,
    ExportPhotosRequest request,
    Action<ExportStatus> progress)
  {
    var status = new ExportStatus();

    var exportColl = photoFs.AddCollection(new AddCollectionRequest()
    {
      kind = "export",
      name = "",
      createDt = DateTime.Now.ToString("o")
    });

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
          var photos = photoFs.PhotoDb.GetPhotosById(id);
          if (photos.Count != 1)
          {
            throw new ArgumentException("Cannot find photo " + id);
          }

          var photo = photos[0];

          if (!folderNames.TryGetValue(photo.folderId, out var folderPath))
          {
            var folder = photoFs.GetFolderInfo(photo.folderId);
            folderPath = folder.path;
            folderNames.Add(photo.folderId, folder.path);
          }

          var targetPath = Path.GetFullPath(photo.fileName + photo.fileExt, folderPath);

          var runPhash = true;

          if (runPhash && request.format == "jpeg" && !(photo.format == (int)MagickFormat.Jpeg || photo.format == (int)MagickFormat.Jpg))
          {
            var destPath = Path.GetFullPath(photo.fileName + ".jpg", exportFolder);
            CopyJpeg(destPath, targetPath);
          }
          else if (request.useSymLink)
          {
            var linkPath = Path.GetFullPath(photo.fileName + photo.fileExt, exportFolder);
            File.CreateSymbolicLink(linkPath, targetPath);
          }
          else
          {
            var linkPath = Path.GetFullPath(photo.fileName + photo.fileExt, exportFolder);
            File.Copy(linkPath, targetPath);
          }

          status.Exported++;

          UpdateExportCollection(photoFs, exportColl.id, photo.id);
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
          photoFs.PhotoDb.AddCollectionItem(request.exportCollection, photo, now.ToBinary());
        }

        Console.WriteLine("Export collection " + request.exportCollection);
      }
    }
    catch (Exception e)
    {
      Console.Error.WriteLine("Failed to export: " + e.Message);
    }
  }

  private static void UpdateExportCollection(PhotoFs fs, Int64 exportCollId, Int64 id)
  {
    var item = new CollectionItem()
    {
      photoId = id,
      updateDt = DateTime.Now.ToString("o")
    };
    fs.AddCollectionItems(exportCollId, new CollectionItem[] { item });
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

