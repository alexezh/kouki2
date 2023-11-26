
using ImageMagick;
using Org.BouncyCastle.Utilities.Encoders;

public class Importer
{
  private static System.Security.Cryptography.SHA1 sha1 = System.Security.Cryptography.SHA1.Create();

  public static string ComputeHash(Stream stm)
  {
    stm.Position = 0;
    var hash = sha1.ComputeHash(stm);
    return Convert.ToBase64String(hash);
  }

  public static int ScanFiles(PhotoDb db, FolderName folder)
  {
    int added = 0;

    foreach (var dir in Directory.EnumerateDirectories(folder.Path))
    {
      added += ScanFiles(db, new FolderName(dir));
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
        var info = new MagickImageInfo(stm);

        stm.Position = 0;
        var hash = ComputeHash(stm);
        var entry = new PhotoEntry()
        {
          FolderId = folderId.Value,
          Name = fileName,
          Hash = hash,
          Width = info.Width,
          Height = info.Height,
          Format = (int)info.Format
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
}