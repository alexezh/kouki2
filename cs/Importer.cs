
using System.Linq.Expressions;
using ImageMagick;
using Org.BouncyCastle.Utilities.Encoders;

public class Importer
{
  private static System.Security.Cryptography.SHA1 sha1 = System.Security.Cryptography.SHA1.Create();

  public static string ComputeHash(Stream stm)
  {
    stm.Position = 0;
    var hash = sha1.ComputeHash(stm);
    return Convert.ToHexString(hash);
  }

  public static int ScanFiles(PhotoDb db, ThumbnailDb thumbnailDb, FolderName folder)
  {
    int added = 0;
    int skipped = 0;

    foreach (var dir in Directory.EnumerateDirectories(folder.Path))
    {
      added += ScanFiles(db, thumbnailDb, new FolderName(dir));
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

      var fileName = Path.GetFileName(file);

      if (db.HasPhoto(folderId.Value, fileName))
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
          Name = fileName,
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
            ReadExif(image, entry);
            GenerateThumbnail(image, thumbnailDb, hash);
          }

          entry.Width = info.Width;
          entry.Height = info.Height;
          entry.Format = (int)info.Format;


          //ExifProfile
        }
        catch (Exception _)
        {
          // nothing to do
          Console.WriteLine("Cannot process " + fileName);
        }

        db.AddPhoto(entry);
        added++;
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
      entry.OriginalDateTime = original.Value;
    }
  }

  private static void GenerateThumbnail(MagickImage image, ThumbnailDb db, string hash)
  {
    image.Resize(256, 0);

    image.Format = MagickFormat.Jpeg;

    using (var stm = new MemoryStream())
    {
      image.Write(stm);
      var imageBytes = stm.ToArray();
      db.AddThumbnail(hash, image.Width, image.Height, imageBytes);
    }
  }
}