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

public class PhotoFs
{
  private PhotoDb _db;
  private static PhotoFs _instance;
  public static PhotoFs Instance => _instance;

  private PhotoFs(string path)
  {
    PhotoDbStatics.CreatePhotoDb(path);
    _db = new PhotoDb(path);
  }

  public static void Open(string path)
  {
    _instance = new PhotoFs(path);
  }

  public int AddSourceFolder(FolderName folder)
  {
    int added = Importer.ScanFiles(_db, folder);
    return added;
  }

  public byte[] GetPhotoBytes(string key)
  {
    var infos = _db.GetPhotosByHash(key);
    if (infos.Count == 0)
    {
      return null;
    }

    var folder = _db.GetFolder(infos[0].FolderId);
    var fileName = Path.Combine(folder.Path, infos[0].Name);
    using (var stm = File.OpenRead(fileName))
    {
      var reader = new BinaryReader(stm);
      return reader.ReadBytes((int)stm.Length);
    }
  }

  public static void CreateLink(SourceFileName nm, OutputFileName on)
  {

  }

  public IEnumerable<PhotoEntry> GetPhotos(Int64 folderId)
  {
    return _db.GetPhotosByFolder(folderId);
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

