using System.Text.Json;
using Microsoft.Data.Sqlite;

public class FolderMetadata
{
  public string path { get; set; }
  public Int64 totalPhotos { get; set; }
}

public class PhotoDbStatics
{
  public static SqliteConnection CreateConnection(string path)
  {
    return new SqliteConnection($"Data Source={path}");
  }

  public static bool Exists(string path)
  {
    return File.Exists(path);
  }

  public static void CreatePhotoDb(string path)
  {
    using (var connection = CreateConnection(path))
    {
      connection.Open();

      Int64 userVersion = ExecuteIntCommand(connection, (SqliteCommand command) =>
      {
        command.CommandText = "PRAGMA user_version;";
      }, "user_version");

      Console.WriteLine("Version " + userVersion);

      CreateTable(connection, "CREATE TABLE IF NOT EXISTS Devices (id integer primary key, name TEXT, archiveFolderId INTEGER, deviceCollectionId INTEGER, metadata TEXT)");
      CreateIndex(connection, "CREATE INDEX IF NOT EXISTS `DeviceName` ON `Devices` (`name` ASC);");

      string[] fields = new string[] {
          "id integer primary key",
          "hash TEXT",
          "originalHash TEXT", // hash of original picture
          "originalDt TEXT",
          "importedDt TEXT",
          "stackId NUMBER", // hash of any photo in the stack
          "folder INTEGER",
          "filename TEXT",
          "fileext TEXT",
          "filesize NUMBER",
          "fav NUMBER",
          "stars NUMBER",
          "color TEXT",
          "width NUMBER",
          "height NUMBER",
          "format NUMBER",
          // imageId from EXIF
          "phash BLOB" };

      CreateTable(connection, $"CREATE TABLE IF NOT EXISTS Photos ({String.Join(',', fields)})");

      AddColumn(connection, "Photos", "hidden", "INTEGER");

      CreateIndex(connection, "CREATE INDEX IF NOT EXISTS `PhotoHash` ON `Photos` (`hash` ASC);");
      CreateIndex(connection, "CREATE INDEX IF NOT EXISTS `PhotoFolder` ON `Photos` (`folder` ASC);");
      CreateIndex(connection, "CREATE INDEX IF NOT EXISTS `PhotoName` ON `Photos` ('filename' ASC);");
      CreateIndex(connection, "CREATE INDEX IF NOT EXISTS `PhotoPath` ON `Photos` (`folder` ASC, 'filename' ASC, 'fileext' ASC);");
      CreateIndex(connection, "CREATE INDEX IF NOT EXISTS `PhotoOriginal` ON `Photos` (`originalHash` ASC);");
      CreateIndex(connection, "CREATE INDEX IF NOT EXISTS `PhotoStack` ON `Photos` (`stackId` ASC);");

      CreateTable(connection, "CREATE TABLE IF NOT EXISTS Collections (id INTEGER PRIMARY KEY, kind TEXT, createDt INTEGER, name TEXT, metadata TEXT)");
      CreateIndex(connection, "CREATE INDEX IF NOT EXISTS `CollectionCreateTime` ON `Collections` (`id` ASC, 'createDt' ASC);");

      CreateTable(connection, "CREATE TABLE IF NOT EXISTS CollectionItems (id INTEGER, photoId INTEGER, updateDt INTEGER, metadata TEXT)");
      CreateIndex(connection, "CREATE UNIQUE INDEX IF NOT EXISTS `CollectionItems_PhotoId` ON `CollectionItems` (`id` ASC, 'photoId' ASC);");

      if (userVersion < 1)
      {
        ConvertFolders(connection);
        userVersion = 1;
        ExecuteVoidCommand(connection, (SqliteCommand command) =>
        {
          command.CommandText = $"PRAGMA user_version = {userVersion};";
        });
      }

      UpdateLibraryStats(connection);
    }
  }

  public static Int64 ExecuteIntCommand(SqliteConnection connection, Action<SqliteCommand> cmd, string name)
  {
    var command = connection.CreateCommand();
    cmd(command);
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return (Int64)reader[name];
      }
    }

    return 0;
  }

  public static void ExecuteVoidCommand(SqliteConnection connection, Action<SqliteCommand> cmd)
  {
    var command = connection.CreateCommand();
    cmd(command);
    using (var reader = command.ExecuteReader())
    {
    }
  }

  private static void UpdateLibraryStats(SqliteConnection connection)
  {
    var collections = CollectionsQueriesExt.GetCollections(connection);
    try
    {
      foreach (var coll in collections)
      {
        if (coll.kind == "folder")
        {
          var count = ExecuteIntCommand(connection,
            (SqliteCommand command) =>
            {
              command.CommandText = $"SELECT COUNT(*) AS count FROM Photos WHERE folder == {coll.id}";
            },
            "count"
          );

          FolderMetadata metaObj;
          if (coll.metadata != null)
          {
            metaObj = JsonSerializer.Deserialize<FolderMetadata>(coll.metadata);
          }
          else
          {
            metaObj = new FolderMetadata();
          }

          metaObj.totalPhotos = count;
          var metaStr = JsonSerializer.Serialize<FolderMetadata>(metaObj);
          ExecuteVoidCommand(connection, (SqliteCommand command) =>
          {
            command.CommandText = $"UPDATE Collections SET metadata=$metadata WHERE id={coll.id}";
            command.Parameters.AddWithValue("$metadata", metaStr);
          });
        }
      }
    }
    catch (Exception e)
    {
      Console.WriteLine("Failed " + e.Message);
      throw;
    }
  }

  private static void ConvertFolders(SqliteConnection connection)
  {
    var folders = FolderQueriesExt.GetSourceFolders(connection);
    var createDt = DateTime.Now.ToBinary();
    try
    {
      foreach (var folder in folders)
      {
        var metaObj = new FolderMetadata();
        metaObj.path = folder.path;
        var metaStr = JsonSerializer.Serialize<FolderMetadata>(metaObj);

        var id = CollectionsQueriesExt.AddCollection(connection, "", "folder", createDt, metaStr);
        if (id == null)
        {
          throw new Exception("Cannot convert folder " + folder.id);
        }

        var command = connection.CreateCommand();
        command.CommandText = $"UPDATE Photos SET folder={id} WHERE folder == {folder.id};";

        command.ExecuteNonQuery();
      }
    }
    catch (Exception e)
    {
      Console.WriteLine("Convestion: exception " + e.Message);
      throw;
    }
  }

  private static void CreateTable(SqliteConnection connection, string commandText)
  {
    var command = connection.CreateCommand();
    command.CommandText = commandText;
    using (var reader = command.ExecuteReader())
    {
      // TODO: check error
    }
  }

  private static bool AddColumn(SqliteConnection connection, string table, string column, string type)
  {
    try
    {
      var command = connection.CreateCommand();
      command.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {type}";

      var val = command.ExecuteNonQuery();

      return true;
    }
    catch (Exception e)
    {
      return false;
    }
  }


  private static void CreateIndex(SqliteConnection connection, string commandText)
  {
    var command = connection.CreateCommand();
    command.CommandText = commandText;
    using (var reader = command.ExecuteReader())
    {
      // TODO: check error
    }
  }

  public static void CreateThumbnailDb(string path)
  {
    using (var connection = CreateConnection(path))
    {
      connection.Open();

      CreateTable(connection, "CREATE TABLE IF NOT EXISTS Thumbnails (hash TEXT, width NUMBER, height NUMBER, data BLOB)");
      CreateIndex(connection, "CREATE INDEX IF NOT EXISTS `ByHash` ON `Thumbnails` (`hash` ASC);");
    }
  }



  private static JsonSerializerOptions jsonOptions = new JsonSerializerOptions()
  {
    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingDefault
  };

  public static string SerializeEntity<T>(T ent)
  {
    string s = JsonSerializer.Serialize(ent, jsonOptions);
    return s;
  }

  internal static T DeserializeEntity<T>(string blob)
  {
    return JsonSerializer.Deserialize<T>(blob);
  }
}

