using System.Text.Json;
using Microsoft.Data.Sqlite;

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

      CreateTable(connection, "CREATE TABLE IF NOT EXISTS Devices (id integer primary key, name TEXT, archiveFolderId INTEGER, deviceCollectionId INTEGER, metadata TEXT)");
      CreateIndex(connection, "CREATE INDEX IF NOT EXISTS `DeviceName` ON `Devices` (`name` ASC);");

      CreateTable(connection, "CREATE TABLE IF NOT EXISTS SourceFolders (id integer primary key, path TEXT, kind TEXT)");
      CreateIndex(connection, "CREATE UNIQUE INDEX IF NOT EXISTS `SourceFolderPath` ON `SourceFolders` (`path` ASC);");

      CreateTable(connection, "CREATE TABLE IF NOT EXISTS OutputFolders (id integer primary key, path TEXT, content TEXT)");


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

