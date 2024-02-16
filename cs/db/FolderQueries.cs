using Microsoft.Data.Sqlite;

public static class FolderQueriesExt
{
  public static Int64? GetFolderId(this PhotoDb self, string path)
  {
    var command = self.Connection.CreateCommand();
    command.CommandText = "SELECT * FROM SourceFolders WHERE path == $path";
    command.Parameters.AddWithValue("$path", path);
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return (Int64)reader["id"];
      }
    }

    return null;
  }

  public static FolderEntry GetFolder(this PhotoDb self, Int64 id)
  {
    var command = self.Connection.CreateCommand();
    command.CommandText = "SELECT * FROM SourceFolders WHERE id == $id";
    command.Parameters.AddWithValue("$id", id);
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return new FolderEntry()
        {
          id = id,
          path = (string)reader["path"]
        };
      }
    }

    return null;
  }

  public static List<FolderEntry> GetSourceFolders(this PhotoDb self)
  {
    return GetSourceFolders(self.Connection);
  }

  public static List<FolderEntry> GetSourceFolders(SqliteConnection connection)
  {
    var command = connection.CreateCommand();
    command.CommandText = "SELECT * FROM SourceFolders";

    var folders = new List<FolderEntry>();
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

  public static Int64? AddSourceFolder(this PhotoDb self, string path, string kind = "user")
  {
    (string, object)[] values = { ("path", path), ("kind", kind) };
    return PhotoQueriesExt.InsertWithId(self.Connection, "SourceFolders", values);
  }
}