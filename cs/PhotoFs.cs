using ImageMagick;
using Microsoft.AspNetCore.Mvc;

public class SourceFileName
{
  public string Path;

  public static string GetFileNameNc(string path)
  {
    var name = System.IO.Path.GetFileName(path);
    return name.ToLower();
  }
}

public class OutputFileName
{

}

public class FolderName
{
  public string Path;

  public FolderName(string path)
  {
    Path = path;
  }

  public FolderName Combine(string last)
  {
    return new FolderName(System.IO.Path.Combine(Path, last));
  }
}

public enum CollectionId : Int32
{
  Quick = 1,
  Import = 2,
  Duplicated = 3
}

public class PhotoFs
{
  private PhotoDb _photoDb;
  private ThumbnailDb _thumbnailDb;
  private static PhotoFs _instance;
  private string _exportPath;
  private string _devicePath;
  public static PhotoFs Instance => _instance;

  private PhotoFs(string dbPath, string exportPath, string devicePath)
  {
    _exportPath = exportPath;
    _devicePath = devicePath;
    var photoPath = Path.GetFullPath("photo.sqlite", dbPath);
    var thumbnailPath = Path.GetFullPath("thumbnail.sqlite", dbPath);
    PhotoDbStatics.CreatePhotoDb(photoPath);
    PhotoDbStatics.CreateThumbnailDb(thumbnailPath);
    _photoDb = new PhotoDb(photoPath);
    _thumbnailDb = new ThumbnailDb(thumbnailPath);
  }

  public PhotoDb PhotoDb => _photoDb;
  public ThumbnailDb ThumbnailDb => _thumbnailDb;
  public string ExportPath => _exportPath;
  public string DevicePath => _devicePath;

  public static void Open(string dbPath, string exportPath, string devicePath)
  {
    _instance = new PhotoFs(dbPath, exportPath, devicePath);
  }

  public bool CheckSourceFolder(FolderName folder)
  {
    return Directory.Exists(folder.Path);
  }

  public string UpdatePhotos(UpdatePhotoRequest[] reqs)
  {
    try
    {
      foreach (var req in reqs)
      {
        _photoDb.UpdatePhoto(req);
      }
    }
    catch (Exception e)
    {
      return "failed";
    }

    return "ok";
  }

  public FileStreamResult GetImageFile(string key)
  {
    var infos = _photoDb.GetPhotosByHash(key);
    if (infos.Count == 0)
    {
      return null;
    }

    var folder = _photoDb.GetFolder(infos[0].folderId);

    var filePath = Path.Combine(folder.path, $"{infos[0].fileName}{infos[0].fileExt}");
    if (infos[0].format == (int)MagickFormat.Jpeg || infos[0].format == (int)MagickFormat.Jpg)
    {
      var file = File.OpenRead(filePath);
      return new FileStreamResult(file, "image/jpeg");
    }
    else
    {
      using (var stm = File.OpenRead(filePath))
      {
        try
        {
          using (var image = new MagickImage(stm))
          {
            image.Format = MagickFormat.Jpeg;

            var jpegStm = new MemoryStream();
            image.Write(jpegStm);
            jpegStm.Position = 0;
            return new FileStreamResult(jpegStm, "image/jpeg");
          }
        }
        catch (Exception e)
        {
          Console.WriteLine("Cannot convert");
          return null;
        }
      }
    }
  }

  public FileStreamResult GetThumbnailFile(string key)
  {
    var infos = _thumbnailDb.GetThumbnail(key);
    if (infos.Count == 0)
    {
      return null;
    }

    return new FileStreamResult(new MemoryStream(infos[0].data), "image/jpeg");
  }

  public IEnumerable<FolderEntry> GetSourceFolders()
  {
    return _photoDb.GetSourceFolders();
  }

  public IEnumerable<CollectionItem> GetFolder(Int64 folderId)
  {
    return _photoDb.GetPhotosByFolder(folderId);
  }

  public IEnumerable<PhotoEntry> GetLibrary()
  {
    return _photoDb.SelectPhotos((command) =>
    {
      command.CommandText = "SELECT * FROM Photos ORDER BY originalDt DESC";
    });
  }

  public IEnumerable<CollectionItem> GetCollectionItems(Int64 id)
  {
    return _photoDb.GetCollectionItems(id);
  }

  public bool AddCollectionItems(Int64 id, CollectionItem[] items)
  {
    try
    {
      foreach (var item in items)
      {
        _photoDb.AddCollectionItem(id, item.photoId, DateTime.Parse(item.updateDt).ToBinary());
      }

      return true;
    }
    catch (Exception e)
    {
      return false;
    }
  }

  public List<CollectionEntry> GetCollections()
  {
    return _photoDb.GetCollections();
  }

  public Int64? AddCollection(AddCollectionRequest request)
  {
    return _photoDb.AddCollection(request.name, request.kind);
  }

  public static void MoveFiles(FolderName dest, List<string> files)
  {
    foreach (var file in files)
    {
      File.Move(file, dest.Path);
    }
  }


  // move duplicates
}

