
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
        db.GetFolderId(folder.Path);
        if (folderId == null)
        {
          folderId = db.AddSourceFolder(folder.Path);
        }
      }

      var fileName = Path.GetFileName(file);

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
          GenerateThumbnail(thumbnailDb, hash, stm);

          entry.Width = info.Width;
          entry.Height = info.Height;
          entry.Format = (int)info.Format;

        }
        catch (Exception _)
        {
          // nothing to do
          Console.WriteLine("Cannot process " + fileName);
        }

        if (!db.HasPhoto(folderId.Value, fileName))
        {
          db.AddPhoto(entry);
          added++;
        }
      }
    }

    return added;
  }

  private static void GenerateThumbnail(ThumbnailDb db, string hash, Stream sourceStm)
  {
    using var image = new MagickImage(sourceStm);
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