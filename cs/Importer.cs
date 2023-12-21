
using System.Drawing;
using ImageMagick;

public class ImportJobResponse
{
  public int AddedFiles { get; set; }
  public int UpdatedFiles { get; set; }
  public string Result { get; set; }
}

public class ImportJob : IJob
{
  public void Run()
  {
    _status.Result = "Processing";

    Importer.ScanFiles(
      PhotoFs.Instance.PhotoDb,
      PhotoFs.Instance.ThumbnailDb,
      new FolderName(_path),
      (ScanStatus status) =>
      {
        _status.AddedFiles = status.Added;
        _status.UpdatedFiles = status.Updated;
      });

    _status.Result = "Done";
    _completed = true;
  }

  private bool _completed = false;
  private ImportJobResponse _status = new ImportJobResponse();
  private string _path;

  public ImportJob(string path)
  {
    _path = path;
  }

  public bool Completed => _completed;

  public object Status => _status;
}

public class RescanJob : IJob
{
  public void Run()
  {
    _status.Result = "Processing";

    Importer.RescanFolder(
      PhotoFs.Instance.PhotoDb,
      PhotoFs.Instance.ThumbnailDb,
      _folderId,
      (ScanStatus status) =>
      {
        _status.AddedFiles = status.Added;
        _status.UpdatedFiles = status.Updated;
      });

    _status.Result = "Done";
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

public class Importer
{
  private static System.Security.Cryptography.SHA1 sha1 = System.Security.Cryptography.SHA1.Create();

  public static string ComputeHash(Stream stm)
  {
    stm.Position = 0;
    var hash = sha1.ComputeHash(stm);
    return Convert.ToHexString(hash);
  }

  public static void RescanFolder(PhotoDb db, ThumbnailDb thumbnailDb, Int64 folderId, Action<ScanStatus> onProgress)
  {
    var status = new ScanStatus();
    var folder = db.folders.GetFolder(folderId);
    ScanFolder(db, thumbnailDb, new FolderName(folder.Path), folderId, onProgress, status);
  }

  public static void ScanFiles(PhotoDb db, ThumbnailDb thumbnailDb, FolderName folder, Action<ScanStatus> onProgress, ScanStatus status = null)
  {
    status = status ?? new ScanStatus();
    foreach (var dir in Directory.EnumerateDirectories(folder.Path))
    {
      ScanFiles(db, thumbnailDb, new FolderName(dir), onProgress, status);
    }

    ScanFolder(db, thumbnailDb, folder, null, onProgress, status);
  }

  private static void ScanFolder(PhotoDb db, ThumbnailDb thumbnailDb, FolderName folder, Int64? folderId, Action<ScanStatus> onProgress, ScanStatus status)
  {
    var e = Directory.EnumerateFiles(folder.Path);
    foreach (var file in e)
    {
      if (folderId == null)
      {
        folderId = db.folders.GetFolderId(folder.Path);
        if (folderId == null)
        {
          folderId = db.folders.AddSourceFolder(folder.Path);
        }
      }

      var fileName = Path.GetFileNameWithoutExtension(file);
      var fileExt = Path.GetExtension(file);

      if (db.HasPhoto(folderId.Value, fileName, fileExt))
      {
        PhotoEntry entry = BuildEntryFromFile(folderId, file, fileName, fileExt, thumbnailDb);
        if (entry != null)
        {
          db.UpdatePhotoFileInfo(entry);
        }

        status.Updated++;
        onProgress(status);
      }
      else
      {
        PhotoEntry entry = BuildEntryFromFile(folderId, file, fileName, fileExt, thumbnailDb);
        if (entry != null)
        {
          db.AddPhoto(entry);
          status.Added++;
          onProgress(status);
        }
      }
    }
  }

  private static PhotoEntry BuildEntryFromFile(
    Int64? folderId,
    string file,
    string fileName,
    string fileExt,
    ThumbnailDb thumbnailDb)
  {
    using (var stm = File.OpenRead(file))
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
          GenerateThumbnail(image, thumbnailDb, hash);
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

  private static void ReadExif(MagickImage image, PhotoEntry entry)
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

      var imageId = profile.GetValue<string>(ExifTag.ImageUniqueID);
      entry.imageId = imageId?.ToString();
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

  private static void GenerateThumbnail(MagickImage image, ThumbnailDb db, string hash)
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
      db.AddThumbnail(hash, thumbSize.Width, thumbSize.Height, imageBytes);
    }
  }
}