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

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE TABLE IF NOT EXISTS SourceFolders (id integer primary key, path TEXT)";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE UNIQUE INDEX IF NOT EXISTS `SourceFolderPath` ON `SourceFolders` (`path` ASC);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE TABLE IF NOT EXISTS OutputFolders (id integer primary key, path TEXT, content TEXT)";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        string[] fields = new string[] {
          "id integer primary key",
          "hash TEXT",
          "originalHash TEXT", // hash of original picture
          "originalDt TEXT",
          "importedDt TEXT",
          "stackHash", // hash of any photo in the stack
          "folder INTEGER",
          "name TEXT",
          "fav BOOLEAN",
          "stars NUMBER",
          "color TEXT",
          "width NUMBER",
          "height NUMBER",
          "format NUMBER" };
        var command = connection.CreateCommand();
        command.CommandText = $"CREATE TABLE IF NOT EXISTS Photos ({String.Join(',', fields)})";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE INDEX IF NOT EXISTS `PhotoHash` ON `Photos` (`hash` ASC);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE INDEX IF NOT EXISTS `PhotoFolder` ON `Photos` (`folder` ASC);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE INDEX IF NOT EXISTS `PhotoName` ON `Photos` (`folder` ASC, 'name' ASC);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE INDEX IF NOT EXISTS `PhotoOriginal` ON `Photos` (`originalHash` ASC);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE INDEX IF NOT EXISTS `PhotoStack` ON `Photos` (`stackHash` ASC);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE TABLE IF NOT EXISTS Collections (id INTEGER, photo TEXT)";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE INDEX IF NOT EXISTS `CollectionId` ON `Collections` (`id` ASC);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }
    }
  }

  public static void CreateThumbnailDb(string path)
  {
    using (var connection = CreateConnection(path))
    {
      connection.Open();

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE TABLE IF NOT EXISTS Thumbnails (hash TEXT, width NUMBER, height NUMBER, data BLOB)";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE INDEX IF NOT EXISTS `ByHash` ON `Thumbnails` (`hash` ASC);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }
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

