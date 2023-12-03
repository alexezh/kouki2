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
  public static PhotoFs Instance => _instance;

  private PhotoFs(string path)
  {
    PhotoDbStatics.CreatePhotoDb(path + "photo.sqlite");
    PhotoDbStatics.CreateThumbnailDb(path + "thumbnail.sqlite");
    _photoDb = new PhotoDb(path + "photo.sqlite");
    _thumbnailDb = new ThumbnailDb(path + "thumbnail.sqlite");
  }

  public static void Open(string path)
  {
    _instance = new PhotoFs(path);
  }

  public int AddSourceFolder(FolderName folder)
  {
    int added = Importer.ScanFiles(_photoDb, _thumbnailDb, folder);
    return added;
  }

  public string UpdatePhoto(UpdatePhotoRequest[] reqs)
  {
    foreach (var req in reqs)
    {
      _photoDb.UpdatePhoto(req);
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

    var folder = _photoDb.folders.GetFolder(infos[0].FolderId);
    var fileName = Path.Combine(folder.Path, infos[0].Name);
    var file = File.OpenRead(fileName);
    return new FileStreamResult(file, "image/jpeg");
  }

  public FileStreamResult GetThumbnailFile(string key)
  {
    var infos = _thumbnailDb.GetThumbnail(key);
    if (infos.Count == 0)
    {
      return null;
    }

    return new FileStreamResult(new MemoryStream(infos[0].Data), "image/jpeg");
  }

  public static void CreateLink(SourceFileName nm, OutputFileName on)
  {

  }

  public IEnumerable<FolderEntry> GetSourceFolders()
  {
    return _photoDb.folders.GetSourceFolders();
  }

  public IEnumerable<PhotoEntry> GetFolder(Int64 folderId)
  {
    return _photoDb.GetPhotosByFolder(folderId);
  }

  public IEnumerable<PhotoEntry> GetCollection(string name)
  {
    if (name == "all")
    {
      return _photoDb.GetAllPhotos();
    }
    else // if (name == "import")
    {
      return new PhotoEntry[0];
    }
    //return _photoDb.GetCollection(name);
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

