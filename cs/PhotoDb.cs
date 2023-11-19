using System.Data.SqlTypes;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;

public static class PasswordHash
{
  const int HashSize = 32;
  public static string Compute(byte[] seed, string pwd)
  {
    var pwdData = Encoding.UTF8.GetBytes(pwd);

    var hash = Rfc2898DeriveBytes.Pbkdf2(pwdData, seed, 20, HashAlgorithmName.SHA256, HashSize);
    return Convert.ToBase64String(hash);
  }

  public static bool Verify(string pwd, string seed64, string hash64)
  {
    var seed = Convert.FromBase64String(seed64);
    var pwdData = Encoding.UTF8.GetBytes(pwd);
    var hash1 = Convert.FromBase64String(hash64);

    var hash2 = Rfc2898DeriveBytes.Pbkdf2(pwdData, seed, 20, HashAlgorithmName.SHA256, HashSize);
    if (hash1.Length != HashSize || hash1.Length != hash2.Length)
    {
      return false;
    }

    for (int i = 0; i < hash1.Length; i++)
      if (hash1[i] != hash2[i])
        return false;

    return true;
  }
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
        var command = connection.CreateCommand();
        command.CommandText = "CREATE TABLE IF NOT EXISTS Photos (folder INTEGER, name TEXT, fav BOOLEAN, stars NUMBER, color TEXT)";
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


public class PhotoEntry
{
  public int FolderId;
  public string Name;
  public bool Favorite;
  public int Stars;
  public int Color;
}

public class PhotoDb
{
  private SqliteConnection _connection;
  private string _path;

  public PhotoDb(string path)
  {
    _path = path;
    _connection = PhotoDbStatics.CreateConnection(path);
    _connection.Open();
  }

  public Int64 AddSourceFolder(string path)
  {
    var command = _connection.CreateCommand();
    command.CommandText = "INSERT INTO SourceFolders(path) VALUES($path) RETURNING id";
    command.Parameters.AddWithValue("$path", path);

    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return (Int64)reader["id"];
      }
    }

    return 0;
  }

  public Int64? GetFolderId(string path)
  {
    var command = _connection.CreateCommand();
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

  public void AddPhoto(Int64 folderId, string fileName)
  {
    var command = _connection.CreateCommand();
    command.CommandText = "INSERT INTO Photos(folder, name) VALUES($folder, $name)";
    //    command.Parameters.AddWithValue("$kind", kind);
    command.Parameters.AddWithValue("$folder", folderId);
    command.Parameters.AddWithValue("$name", fileName);
    //    command.Parameters.AddWithValue("$content", contentBlob);

    var inserted = command.ExecuteNonQuery();
    if (inserted != 1)
    {
      throw new ArgumentException("Cannot insert");
    }
  }

  public bool HasPhoto(Int64 folderId, string fileName)
  {
    var command = _connection.CreateCommand();
    command.CommandText = "SELECT * FROM Photos WHERE folder == $folder and name == $name";
    command.Parameters.AddWithValue("$folder", folderId);
    command.Parameters.AddWithValue("$name", fileName);

    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return true;
      }
    }

    return false;
  }

  public void UpdateEntity<T>(int kind, string id, T content) where T : class
  {
    if (!TryUpdateEntity(kind, id, content))
    {
      throw new ArgumentException("Cannot insert");
    }
  }

  public void UpdateEntityRaw(int kind, string id, string content)
  {
    if (!TryUpdateEntityRaw(kind, id, content))
    {
      throw new ArgumentException("Cannot insert");
    }
  }

  public bool TryUpdateEntity<T>(int kind, string id, T content) where T : class
  {
    var contentBlob = PhotoDbStatics.SerializeEntity(content);

    var command = _connection.CreateCommand();
    command.CommandText = "UPDATE Entities SET content = $content WHERE kind == $kind AND id == $id";
    command.Parameters.AddWithValue("$kind", kind);
    command.Parameters.AddWithValue("$id", id);
    command.Parameters.AddWithValue("$content", contentBlob);

    var updated = command.ExecuteNonQuery();
    if (updated != 1)
    {
      return false;
    }

    return true;
  }

  public bool TryUpdateEntityRaw(int kind, string id, string content)
  {
    var command = _connection.CreateCommand();
    command.CommandText = "UPDATE Entities SET content = $content WHERE kind == $kind AND id == $id";
    command.Parameters.AddWithValue("$kind", kind);
    command.Parameters.AddWithValue("$id", id);
    command.Parameters.AddWithValue("$content", content);

    var updated = command.ExecuteNonQuery();
    if (updated != 1)
    {
      return false;
    }

    return true;
  }

  internal List<string> GetItems(int kind)
  {
    var ent = new List<string>();

    var command = _connection.CreateCommand();
    command.CommandText = "SELECT * FROM Photos WHERE folder == $kind";
    command.Parameters.AddWithValue("$kind", kind);
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        ent.Add(reader["content"] as string);
      }
    }

    return ent;
  }

  internal List<Tuple<string, string>> LoadEntities2(int kind, string prefix = null)
  {
    var ent = new List<Tuple<string, string>>();

    var command = _connection.CreateCommand();
    if (prefix == null)
    {
      command.CommandText = "SELECT * FROM Entities WHERE kind == $kind";
      command.Parameters.AddWithValue("$kind", kind);
    }
    else
    {
      command.CommandText = "SELECT * FROM Entities WHERE kind == $kind AND id LIKE $id";
      command.Parameters.AddWithValue("$kind", kind);
      command.Parameters.AddWithValue("$id", prefix + "%");
    }
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        var value = reader["content"] as string;
        var id = reader["id"] as string;
        ent.Add(new Tuple<string, string>(id, value));
      }
    }

    return ent;
  }

  internal T LoadEntity<T>(int kind, string id) where T : class
  {
    var command = _connection.CreateCommand();
    command.CommandText = "SELECT * FROM Entities WHERE kind == $kind AND id == $id";
    command.Parameters.AddWithValue("$kind", kind);
    command.Parameters.AddWithValue("$id", id);
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        var data = reader["content"] as string;
        return PhotoDbStatics.DeserializeEntity<T>(data);
      }
    }

    return null;
  }

  internal string LoadEntity(int kind, string id)
  {
    var command = _connection.CreateCommand();
    command.CommandText = "SELECT * FROM Entities WHERE kind == $kind AND id == $id";
    command.Parameters.AddWithValue("$kind", kind);
    command.Parameters.AddWithValue("$id", id);
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        var data = reader["content"] as string;
        return data;
      }
    }

    return null;
  }
}
