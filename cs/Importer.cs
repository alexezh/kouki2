
using System.Drawing;
using System.Globalization;
using System.Linq.Expressions;
using ImageMagick;
using Org.BouncyCastle.Utilities.Encoders;

public class ImportJobResponse
{
  public int ProcessedFiles { get; set; }
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
      () =>
      {
        _status.ProcessedFiles++;
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

public class Importer
{
  private static System.Security.Cryptography.SHA1 sha1 = System.Security.Cryptography.SHA1.Create();

  public static string ComputeHash(Stream stm)
  {
    stm.Position = 0;
    var hash = sha1.ComputeHash(stm);
    return Convert.ToHexString(hash);
  }

  public static int ScanFiles(PhotoDb db, ThumbnailDb thumbnailDb, FolderName folder, Action onAdded)
  {
    int added = 0;
    int skipped = 0;

    foreach (var dir in Directory.EnumerateDirectories(folder.Path))
    {
      added += ScanFiles(db, thumbnailDb, new FolderName(dir), onAdded);
    }

    Int64? folderId = null;

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
        skipped++;
        continue;
      }

      using (var stm = File.OpenRead(file))
      {
        // get hash of actual content
        stm.Position = 0;
        var hash = ComputeHash(stm);

        var entry = new PhotoEntry()
        {
          FolderId = folderId.Value,
          FileName = fileName,
          FileExt = fileExt,
          Hash = hash,
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
            entry.Width = imageSize.Width;
            entry.Height = imageSize.Height;
            entry.Format = (int)info.Format;

            ReadExif(image, entry);
            GenerateThumbnail(image, thumbnailDb, hash);
          }
        }
        catch (Exception _)
        {
          // nothing to do
          Console.WriteLine("Cannot process " + fileName);
        }

        db.AddPhoto(entry);
        added++;
        onAdded();
      }
    }

    return added;
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
      entry.OriginalDateTime = original.ToString();
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