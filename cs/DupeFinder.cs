public class FileGroup
{
  private Dictionary<string, List<SourceFileName>> Group = new Dictionary<string, List<SourceFileName>>();


}

public class DuplicateFinder
{
  public static List<PhotoEntry> GetDuplicates(PhotoDb photoDb)
  {
    return photoDb.SelectPhotos((command) =>
    {
      command.CommandText = "select * from photos where exists (select 1 from photos p2 where photos.filename == p2.filename and photos.rowid != p2.rowid) order by filename";

      //command.CommandText = "SELECT Name, count(Hash) AS count FROM Photos GROUP BY Name;";
    });
  }

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
