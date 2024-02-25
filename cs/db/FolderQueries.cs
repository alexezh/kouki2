using Microsoft.Data.Sqlite;

public class FolderEntry
{
  public Int64 id { get; set; }
  public string path { get; set; }
}

public static class FolderQueriesExt
{
  public static List<FolderEntry> GetSourceFolders(SqliteConnection connection)
  {
    var folders = new List<FolderEntry>();

    try
    {
      var command = connection.CreateCommand();
      command.CommandText = "SELECT * FROM SourceFolders";

      using (var reader = command.ExecuteReader())
      {
        while (reader.Read())
        {
          folders.Add(new FolderEntry()
          {
            id = (Int64)reader["id"],
            path = (string)reader["path"]
          });
        }
      }

      return folders;
    }
    catch (SqliteException e)
    {
      if (e.SqliteErrorCode == 1)
      {
        return folders;
      }

      throw;
    }
  }
}