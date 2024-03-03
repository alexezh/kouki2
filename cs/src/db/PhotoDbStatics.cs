using System.Text.Json;
using Microsoft.Data.Sqlite;

public class CollectionMetadata
{
  public Int64 totalPhotos { get; set; }
}

public class FolderMetadata : CollectionMetadata
{
  public string path { get; set; }
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

      Int64 userVersion = ReaderExt.ExecuteIntCommand(connection, (command) =>
      {
        command.CommandText = "PRAGMA user_version;";
      }, "user_version");

      Console.WriteLine("Version " + userVersion);

      if (userVersion < 1)
      {
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

        ConvertFolders(connection);
      }

      if (userVersion < 2)
      {
        AddColumn(connection, "Photos", "alttext", "TEXT");
      }

      if (userVersion < 3)
      {
        CreateTable(connection, "CREATE VIRTUAL TABLE AltText USING fts5(text, photoId UNINDEXED)");
      }

      if (userVersion < 4)
      {
        AddColumn(connection, "Photos", "alttexte", "BLOB");
      }

      if (userVersion < 5)
      {
        ConvertPhotoTime2(connection);

        userVersion = 5;
        ReaderExt.ExecuteVoidCommand(connection, (command) =>
        {
          command.CommandText = $"PRAGMA user_version = {userVersion};";
        });
      }

      CollectionStatUpdater.UpdateLibraryStats(connection);
    }
  }

  private static void ConvertPhotoTime2(SqliteConnection connection)
  {
    AddColumn(connection, "Photos", "originalDt2", "INTEGER");
    AddColumn(connection, "Photos", "importedDt2", "INTEGER");
    CreateIndex(connection, "CREATE INDEX IF NOT EXISTS `PhotoOriginalDt` ON `Photos` (`originalDt2` ASC);");

    // might take a while
    var items = new List<Tuple<Int64, DateTime?, DateTime?>>();
    {
      var command = connection.CreateCommand();
      command.CommandText = $"SELECT id, originalDt, importedDt FROM Photos;";
      using (var reader = command.ExecuteReader())
      {
        while (reader.Read())
        {
          items.Add(new Tuple<long, DateTime?, DateTime?>(
            reader.ReadInt64("id"),
          reader.ReadMagicTime("originalDt"),
          reader.ReadMagicTime("importedDt")));
        }
      }
    }

    foreach (var item in items)
    {
      Int64 original = item.Item2 != null ? item.Item2.Value.ToBinary() : 0;
      Int64 updated = item.Item3 != null ? item.Item3.Value.ToBinary() : 0;

      ReaderExt.ExecuteVoidCommand(connection, (command) =>
      {
        command.CommandText = $"UPDATE Photos SET originalDt2={original}, importedDt2={updated} WHERE id == {item.Item1};";
      });
    }

    //connection.Cre
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
}

public static class CollectionStatUpdater
{
  public static void UpdateLibraryStats(SqliteConnection connection)
  {
    var collections = CollectionsQueriesExt.GetCollections(connection);

    var updateCollections = false;
    var idx = collections.FindIndex((x) => x.kind == "all");
    if (idx == -1)
    {
      CollectionsQueriesExt.AddCollection(connection, "", "all", DateTime.Now.ToBinary());
      updateCollections = true;
    }

    idx = collections.FindIndex((x) => x.kind == "favorite");
    if (idx == -1)
    {
      CollectionsQueriesExt.AddCollection(connection, "", "favorite", DateTime.Now.ToBinary());
      updateCollections = true;
    }

    idx = collections.FindIndex((x) => x.kind == "rejected");
    if (idx == -1)
    {
      CollectionsQueriesExt.AddCollection(connection, "", "rejected", DateTime.Now.ToBinary());
      updateCollections = true;
    }

    idx = collections.FindIndex((x) => x.kind == "hidden");
    if (idx == -1)
    {
      CollectionsQueriesExt.AddCollection(connection, "", "hidden", DateTime.Now.ToBinary());
      updateCollections = true;
    }

    if (updateCollections)
    {
      collections = CollectionsQueriesExt.GetCollections(connection);
    }

    try
    {
      foreach (var coll in collections)
      {
        if (coll.kind == "folder")
        {
          UpdateFolderStats(connection, coll);
        }
        else if (coll.kind == "all")
        {
          UpdateSyntheticCollection(connection, coll, "");
        }
        else if (coll.kind == "favorite")
        {
          UpdateSyntheticCollection(connection, coll, "WHERE fav > 0");
        }
        else if (coll.kind == "rejected")
        {
          UpdateSyntheticCollection(connection, coll, "WHERE fav < 0");
        }
        else if (coll.kind == "hidden")
        {
          UpdateSyntheticCollection(connection, coll, "WHERE hidden != 0");
        }
        else
        {
          UpdateCollection(connection, coll);
        }
      }
    }
    catch (Exception e)
    {
      Console.WriteLine("Failed " + e.Message);
      throw;
    }
  }

  private static void UpdateFolderStats(SqliteConnection connection, CollectionEntry coll)
  {
    var count = ReaderExt.ExecuteIntCommand(connection,
      (SqliteCommand command) =>
      {
        command.CommandText = $"SELECT COUNT(*) AS count FROM Photos WHERE folder == {coll.id}";
      },
      "count"
    );

    UpdateCollectionCount<FolderMetadata>(connection, coll, count);
  }

  private static void UpdateCollection(SqliteConnection connection, CollectionEntry coll)
  {
    var count = ReaderExt.ExecuteIntCommand(connection,
      (command) =>
      {
        command.CommandText = $"SELECT COUNT(*) AS count FROM CollectionItems WHERE id == {coll.id}";
      },
      "count"
    );

    UpdateCollectionCount<CollectionMetadata>(connection, coll, count);
  }

  private static void UpdateSyntheticCollection(SqliteConnection connection, CollectionEntry coll, string expr)
  {
    var count = ReaderExt.ExecuteIntCommand(connection,
      (command) =>
      {
        command.CommandText = $"SELECT COUNT(*) AS count FROM Photos {expr}";
      },
      "count"
    );

    UpdateCollectionCount<CollectionMetadata>(connection, coll, count);
  }

  private static void UpdateCollectionCount<T>(SqliteConnection connection, CollectionEntry coll, Int64 count) where T : CollectionMetadata, new()
  {
    var metaStr = PhotoFs.UpdateCollectionCount<T>(coll, count);
    ReaderExt.ExecuteVoidCommand(connection, (command) =>
    {
      command.CommandText = $"UPDATE Collections SET metadata=$metadata WHERE id={coll.id}";
      command.Parameters.AddWithValue("$metadata", metaStr);
    });
  }
}

