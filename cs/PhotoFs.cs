
using System.Text.RegularExpressions;

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

  public PhotoFs(string path)
  {
    PhotoDbStatics.CreatePhotoDb(path);
    _db = new PhotoDb(path);
  }

  public void AddSourceFolder(FolderName name)
  {
    var folderId = _db.AddSourceFolder(name.Path);

    ScanFiles(name);
  }

  private void ScanFiles(FolderName name)
  {
    var id = _db.GetFolderId(name.Path);

    var e = Directory.EnumerateFiles(name.Path);
    foreach (var file in e)
    {
      _db.AddPhoto(id, file);
    }
  }

  public static void CreateLink(SourceFileName nm, OutputFileName on)
  {

  }

  public static IEnumerable<SourceFileName> GetFiles()
  {
    //    PhotoDbStatics.
    return null;
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

public class FileGroup
{
  private Dictionary<string, List<SourceFileName>> Group = new Dictionary<string, List<SourceFileName>>();


}

public class DuplicateFinder
{
  /// <summary>
  /// for now scan files with the same name but different extensions
  /// </summary>
  public static IEnumerable<IGrouping<string, string>> ScanDuplicates(FolderName folder)
  {
    var map = new Dictionary<string, List<SourceFileName>>();
    var files = Directory.EnumerateFiles(folder.Path);
    var groups = files.GroupBy(x => SourceFileName.GetFileNameNc(x));

    foreach (IGrouping<string, string> group in groups)
    {
      if (group.Count() > 1)
      {
        yield return group;
      }
    }
  }

  public static (string, List<string>) SelectBestByExt(List<string> opt)
  {
    int bestIdx = 0;
    for (int i = 1; i < opt.Count; i++)
    {

    }
    return ("", opt);
  }

  public static void MoveDuplicagtes(FolderName folder)
  {
    // foreach (var group in ScanDuplicates(folder) {
    //   var values = group.ToList();
    //   var (keep, move) = SelectBestByExt(values);
    //   PhotoFs.MoveFiles(folder.Combine("duplicates"), move);
    // }
  }
}
