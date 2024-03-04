using System.Text.Json;
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
      return ResultResponse.Failed;
    }

    return ResultResponse.Ok;
  }

  public Int64? AddFolderCollection(string path, string kind = "folder")
  {
    var metadata = new FolderMetadata()
    {
      path = path
    };
    var metadataStr = JsonSerializer.Serialize(metadata);
    var entry = AddCollection(new AddCollectionRequest()
    {
      kind = "folder",
      name = "",
      createDt = DateTime.Now.ToString("o"),
      metadata = metadataStr,
    });

    return entry.id;
  }

  public FileStreamResult GetImageFile(string key)
  {
    var infos = _photoDb.GetPhotosByHash(key);
    if (infos.Count == 0)
    {
      return null;
    }

    var folder = GetFolderInfo(infos[0].folderId);

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

  public IEnumerable<CollectionItem> GetFolderItems(Int64 collectionId)
  {
    return _photoDb.GetPhotosByFolder(collectionId);
  }

  public FolderMetadata GetFolderInfo(Int64 collectionId)
  {
    var coll = _photoDb.GetCollection(collectionId);
    var folder = JsonSerializer.Deserialize<FolderMetadata>(coll.metadata);
    return folder;
  }

  public IEnumerable<PhotoEntry> GetLibrary(Int64 minId)
  {
    return _photoDb.SelectPhotos((command) =>
    {
      command.CommandText = "SELECT * FROM Photos WHERE id>=$id ORDER BY originalDt2 DESC";
      command.Parameters.AddWithValue("$id", minId);
    });
  }

  public IEnumerable<PhotoEntry> GetPhotos(GetPhotosRequest request)
  {
    return _photoDb.SelectPhotos((command) =>
    {
      if (request.collectionId != 0)
      {
        var coll = PhotoDb.GetCollection(request.collectionId);
        if (coll.kind == "folder")
        {
          command.CommandText = "SELECT * FROM Photos WHERE id>=$id AND folderId>=$folderId ORDER BY originalDt2 DESC";
          command.Parameters.AddWithValue("$id", request.minId);
          command.Parameters.AddWithValue("$folderId", request.collectionId);
        }
        else
        {
          throw new Exception("Not supported");
        }
      }
      else if (request.startDt != null)
      {
        var startDt = DateTime.Parse(request.startDt);
        command.CommandText = "SELECT * FROM Photos WHERE id>=$id AND originalDt2>=$startDt ORDER BY originalDt2 DESC";
        command.Parameters.AddWithValue("$id", request.minId);
        var startVal = startDt.Ticks;
        command.Parameters.AddWithValue("$startDt", startVal);
      }
      else
      {
        command.CommandText = "SELECT * FROM Photos WHERE id>=$id ORDER BY originalDt2 DESC";
        command.Parameters.AddWithValue("$id", request.minId);
      }
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

  public CollectionEntry AddCollection(AddCollectionRequest request)
  {
    var createDt = DateTime.Parse(request.createDt).ToBinary();
    var id = _photoDb.AddCollection(request.name, request.kind, createDt, request.metadata);
    if (id == null)
    {
      return null;
    }

    return new CollectionEntry()
    {
      createDt = DateTime.FromBinary(createDt).ToString("o"),
      id = id.Value,
      name = ""
    };
  }

  public void UpdateCollection(Int64 id, UpdateCollectionRequest request)
  {
    var entry = _photoDb.GetCollection(id);
    if (entry == null)
    {
      throw new Exception("Collection not found");
    }

    string metaStr = null;
    if (entry.kind == "folder")
    {
      metaStr = UpdateCollectionCount<FolderMetadata>(entry, request.totalPhotos);
    }
    else
    {
      metaStr = UpdateCollectionCount<CollectionMetadata>(entry, request.totalPhotos);
    }

    _photoDb.UpdateCollection(id, metaStr);
  }

  public static string UpdateCollectionCount<T>(CollectionEntry coll, Int64 count) where T : CollectionMetadata, new()
  {
    T metaObj;
    if (coll.metadata != null)
    {
      metaObj = JsonSerializer.Deserialize<T>(coll.metadata);
    }
    else
    {
      metaObj = new T();
    }

    metaObj.totalPhotos = count;
    var metaStr = JsonSerializer.Serialize<T>(metaObj);
    return metaStr;
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

