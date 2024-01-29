
using System.Drawing;
using ImageMagick;

public class ImportFolderRequest
{
  public string folder { get; set; }
  public Int64 importCollection { get; set; }
  public bool dryRun { get; set; }
}

public class ImportJobResponse : GetJobStatusResponse
{
  public int addedFiles { get; set; }
  public int updatedFiles { get; set; }
}

public class ImportJob : IJob
{
  public void Run()
  {
    _status.result = ResultResponse.Processing;

    try
    {
      string path = this._request.folder.TrimStart();
      if (path.Length == 0)
      {
        throw new ArgumentException("Path should not be empty");
      }

      string fullPath;
      if (path[0] == '~')
      {
        var profilePath = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var relPath = path.Substring(1);
        if (relPath.Length >= 1 && (relPath[0] == '/' || relPath[0] == '\\'))
        {
          relPath = relPath.Substring(1);
        }
        path = Path.Combine(profilePath, relPath);
      }
      else
      {
        path = Path.GetFullPath(path);
      }
      Console.WriteLine("ImportJob: importing " + path);

      if (!Directory.Exists(path))
      {
        throw new ArgumentException("Folder does not exist");
      }

      IFileImporter importer;
      if (_request.dryRun)
      {
        importer = new FileImportedDry();
      }
      else
      {
        importer = new FileImporter(
          PhotoFs.Instance.PhotoDb,
          PhotoFs.Instance.ThumbnailDb);
      }
      FolderImporter.ScanFiles(
        new FolderName(path),
        importer,
        (ScanStatus status) =>
        {
          _status.addedFiles = status.Added;
          _status.updatedFiles = status.Updated;
        });

      Console.WriteLine("Import completed");
      _status.result = ResultResponse.Done;
      _completed = true;
    }
    catch (Exception e)
    {
      Console.Error.WriteLine("ImportJob: exception " + e.Message);
      _status.result = ResultResponse.Failed;
      _status.message = e.Message;
      _completed = true;
    }
  }

  private bool _completed = false;
  private ImportJobResponse _status = new ImportJobResponse();
  private ImportFolderRequest _request;

  public ImportJob(ImportFolderRequest request)
  {
    _request = request;
  }

  public bool Completed => _completed;

  public object Status => _status;
}

public class RescanJob : IJob
{
  public void Run()
  {
    _status.result = ResultResponse.Processing;

    FolderImporter.RescanFolder(
      PhotoFs.Instance.PhotoDb,
      PhotoFs.Instance.ThumbnailDb,
      _folderId,
      (ScanStatus status) =>
      {
        _status.addedFiles = status.Added;
        _status.updatedFiles = status.Updated;
      });

    _status.result = ResultResponse.Done;
    _completed = true;
  }

  private bool _completed = false;
  private ImportJobResponse _status = new ImportJobResponse();
  private Int64 _folderId;

  public RescanJob(Int64 folderId)
  {
    _folderId = folderId;
  }

  public bool Completed => _completed;

  public object Status => _status;
}

public class ScanStatus
{
  public int Added;
  public int Skipped;
  public int Updated;
}

public interface IFileImporter
{
  bool HasPhoto(Int64 folderId, string fileName, string fileExt);

  public void UpdatePhoto(Int64? folderId,
    string filePath,
    string fileName,
    string fileExt);

  public bool AddPhoto(
    Int64? folderId,
    string filePath,
    string fileName,
    string fileExt);

  public Int64? GetFolderId(string path);
}

public class FileImporter : IFileImporter
{
  private PhotoDb db;
  private ThumbnailDb thumbnailDb;

  public FileImporter(PhotoDb db_, ThumbnailDb thumbnailDb_)
  {
    db = db_;
    thumbnailDb = thumbnailDb_;
  }

  public Int64? GetFolderId(string path)
  {
    var folderId = db.GetFolderId(path);
    if (folderId == null)
    {
      var temp = db.AddSourceFolder(path);
      if (temp == null)
      {
        throw new ArgumentException("Cannot create folder");
      }
      folderId = temp.Value;
    }

    return folderId;
  }

  public bool HasPhoto(Int64 folderId, string fileName, string fileExt)
  {
    return db.HasPhoto(folderId, fileName, fileExt);
  }

  public void UpdatePhoto(
    Int64? folderId,
    string filePath,
    string fileName,
    string fileExt)
  {
    PhotoEntry entry = BuildEntryFromFile(folderId, filePath, fileName, fileExt);
    if (entry != null)
    {
      db.UpdatePhotoFileInfo(entry);
    }
  }

  public bool AddPhoto(
    Int64? folderId,
    string filePath,
    string fileName,
    string fileExt)
  {
    PhotoEntry entry = BuildEntryFromFile(folderId, filePath, fileName, fileExt);
    if (entry != null)
    {
      db.AddPhoto(entry);
      return true;
    }
    return false;
  }

  public Int64? AddFile(Int64 folderId, string filePath, bool favorite)
  {
    var fileName = Path.GetFileNameWithoutExtension(filePath);
    var fileExt = Path.GetExtension(filePath);

    PhotoEntry entry = BuildEntryFromFile(folderId, filePath, fileName, fileExt);
    if (entry == null)
    {
      return null;
    }

    entry.favorite = (favorite) ? 1 : 0;

    return db.AddPhoto(entry);
  }

  private PhotoEntry BuildEntryFromFile(
    Int64? folderId,
    string filePath,
    string fileName,
    string fileExt)
  {
    using (var stm = File.OpenRead(filePath))
    {
      // get hash of actual content
      stm.Position = 0;
      var hash = ComputeHash(stm);

      var entry = new PhotoEntry()
      {
        folderId = folderId.Value,
        fileName = fileName,
        fileExt = fileExt,
        fileSize = stm.Length,
        hash = hash,
      };

      try
      {
        stm.Position = 0;
        try
        {
          var info = new MagickImageInfo(stm);

          // generate thumbnail
          stm.Position = 0;

          using (var image = new MagickImage(stm))
          {
            // save image and orientation
            var imageSize = GetImageSize(image);
            entry.width = imageSize.Width;
            entry.height = imageSize.Height;
            entry.format = (int)info.Format;

            ReadExif(image, entry);
            try
            {
              GenerateThumbnail(image, hash);
            }
            catch (Exception e)
            {
              Console.WriteLine("Cannot generate thumbnail: " + e.Message);
            }
          }
        }
        catch (Exception e)
        {
          // log and continue
          Console.WriteLine("Cannot read image: " + fileName + fileExt);
        }

        return entry;
      }
      catch (Exception _)
      {
        // nothing to do
        Console.WriteLine("Cannot process " + fileName);
        return null;
      }
    }
  }

  private void ReadExif(MagickImage image, PhotoEntry entry)
  {
    var profile = image.GetExifProfile();

    // Check if image contains an exif profile
    if (profile is null)
    {
      Console.WriteLine("ReadExif: missing");
    }
    else
    {
      var original = profile.GetValue<string>(ExifTag.DateTimeOriginal);
      entry.originalDateTime = original.ToString();

      //var imageId = profile.GetValue<string>(ExifTag.ImageUniqueID);
      //entry.imageId = imageId?.ToString();
    }
  }

  private static Size GetImageSize(MagickImage image)
  {
    var width = image.Width;
    var height = image.Height;

    switch (image.Orientation)
    {
      case OrientationType.Undefined:
      case OrientationType.TopLeft:
      case OrientationType.BottomLeft:
      case OrientationType.LeftBotom:
      case OrientationType.LeftTop:
        return new Size(width, height);
      case OrientationType.TopRight:
      case OrientationType.BottomRight:
      case OrientationType.RightTop:
      case OrientationType.RightBottom:
        return new Size(height, width);
      default:
        return new Size(width, height);
    }
  }

  private void GenerateThumbnail(MagickImage image, string hash)
  {
    // if (image.Orientation != OrientationType.Undefined)
    // {
    //   Console.WriteLine("hello");
    // }

    image.Resize(256, 0);
    var thumbSize = GetImageSize(image);
    image.Format = MagickFormat.Jpeg;

    using (var stm = new MemoryStream())
    {
      image.Write(stm);
      var imageBytes = stm.ToArray();
      thumbnailDb.AddThumbnail(hash, thumbSize.Width, thumbSize.Height, imageBytes);
    }
  }

  private static System.Security.Cryptography.SHA1 sha1 = System.Security.Cryptography.SHA1.Create();

  public static string ComputeHash(Stream stm)
  {
    stm.Position = 0;
    var hash = sha1.ComputeHash(stm);
    return Convert.ToHexString(hash);
  }
}

public class FileImportedDry : IFileImporter
{
  public bool AddPhoto(long? folderId, string filePath, string fileName, string fileExt)
  {
    return true;
  }

  public long? GetFolderId(string path)
  {
    return 1;
  }

  public bool HasPhoto(long folderId, string fileName, string fileExt)
  {
    return false;
  }

  public void UpdatePhoto(long? folderId, string filePath, string fileName, string fileExt)
  {
  }
}

public class FolderImporter
{
  public static void RescanFolder(PhotoDb db, ThumbnailDb thumbnailDb, Int64 folderId, Action<ScanStatus> onProgress)
  {
    var status = new ScanStatus();
    var folder = db.GetFolder(folderId);
    ScanFolder(new FolderName(folder.path), folderId, new FileImporter(db, thumbnailDb), onProgress, status);
  }

  public static void ScanFiles(
    FolderName folder,
    IFileImporter importer,
    Action<ScanStatus> onProgress,
    ScanStatus status = null)
  {
    try
    {
      status = status ?? new ScanStatus();
      foreach (var dir in Directory.EnumerateDirectories(folder.Path))
      {
        ScanFiles(new FolderName(dir), importer, onProgress, status);
      }
    }
    catch (Exception e)
    {
      Console.WriteLine("ScanFiles: exception " + e.Message);
    }

    ScanFolder(folder, null, importer, onProgress, status);
  }

  private static void ScanFolder(
    FolderName folder,
    Int64? folderId,
    IFileImporter importer,
    Action<ScanStatus> onProgress,
    ScanStatus status)
  {
    try
    {
      var fileEnum = Directory.EnumerateFiles(folder.Path);
      foreach (var file in fileEnum)
      {
        try
        {
          if (folderId == null)
          {
            folderId = importer.GetFolderId(folder.Path);
          }

          var fileName = Path.GetFileNameWithoutExtension(file);
          var fileExt = Path.GetExtension(file);

          if (importer.HasPhoto(folderId.Value, fileName, fileExt))
          {
            importer.UpdatePhoto(folderId, file, fileName, fileExt);

            status.Updated++;
            onProgress(status);
          }
          else
          {
            if (importer.AddPhoto(folderId, file, fileName, fileExt))
            {
              status.Added++;
              onProgress(status);
            }
          }
        }
        catch (Exception e)
        {
          Console.WriteLine("ScanFolder: exception " + e.Message);
          status.Skipped++;
          onProgress(status);
        }
      }
    }
    catch (Exception e)
    {
      Console.WriteLine("ScanFolder: folder exception " + e.Message);
    }
  }
}