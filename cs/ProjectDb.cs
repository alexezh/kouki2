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

public class ProjectDbStatics
{
  private static string GetDbPath(string id)
  {
    return $"data/bark_{id}.db";
  }

  public static SqliteConnection CreateConnection(string id)
  {
    return new SqliteConnection($"Data Source={GetDbPath(id)}");
  }

  public static bool Exists(string id)
  {
    return File.Exists(GetDbPath(id));
  }

  public static void CreateProjectDb(string id)
  {
    using (var connection = CreateConnection(id))
    {
      connection.Open();

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE TABLE IF NOT EXISTS Entities (id TEXT, kind, INTEGER, content TEXT)";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE UNIQUE INDEX IF NOT EXISTS `Ids` ON `Entities` (`id` ASC);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      // list of messages
      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE TABLE IF NOT EXISTS Messages (id TEXT, threadId TEXT, time INTEGER, content TEXT)";
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

public class UserDbStatics
{
  private static string GetDbPath()
  {
    return $"data/users.db";
  }

  public static SqliteConnection CreateConnection()
  {
    return new SqliteConnection($"Data Source={GetDbPath()}");
  }

  public static bool Exists(string id)
  {
    return File.Exists(GetDbPath());
  }

  public static void CreateUserDb()
  {
    using (var connection = CreateConnection())
    {
      connection.Open();

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE TABLE IF NOT EXISTS Users (id TEXT, seed TEXT, pwd TEXT);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE UNIQUE INDEX IF NOT EXISTS `UsersU` ON `Users` (`id` ASC);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE TABLE IF NOT EXISTS Sessions (id TEXT, userId TEXT);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }

      {
        var command = connection.CreateCommand();
        command.CommandText = "CREATE UNIQUE INDEX IF NOT EXISTS `SessionsU` ON `Sessions` (`id` ASC);";
        using (var reader = command.ExecuteReader())
        {
          // TODO: check error
        }
      }
    }
  }

  public static void AddUser(string id, string pwd)
  {
    var seed = RandomNumberGenerator.GetBytes(32);
    var seed64 = Convert.ToBase64String(seed);
    var hash = PasswordHash.Compute(seed, pwd);

    using (var connection = CreateConnection())
    {
      connection.Open();

      var command = connection.CreateCommand();
      command.CommandText = "INSERT INTO Users(id, seed, pwd) VALUES($id, $seed, $pwd)";
      command.Parameters.AddWithValue("$id", id);
      command.Parameters.AddWithValue("$seed", seed64);
      command.Parameters.AddWithValue("$pwd", hash);

      var inserted = command.ExecuteNonQuery();
      if (inserted != 1)
      {
        throw new ArgumentException("Cannot insert");
      }
    }
  }

  private static bool VerifyUser(SqliteConnection connection, string name, string pwd)
  {
    var command = connection.CreateCommand();
    command.CommandText = "SELECT * FROM Users WHERE id == $id";
    command.Parameters.AddWithValue("$id", name);

    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        var seed64 = reader["seed"] as string;
        var hash64 = reader["pwd"] as string;

        if (!PasswordHash.Verify(pwd, seed64, hash64))
        {
          return false;
        }

        return true;
      }
    }

    return false;
  }

  public static string LoginUser(string name, string pwd)
  {
    using (var connection = CreateConnection())
    {
      connection.Open();

      if (!VerifyUser(connection, name, pwd))
      {
        return null;
      }

      // allocate session 
      var session = RandomNumberGenerator.GetBytes(32);
      var session64 = Convert.ToBase64String(session);

      {
        var command = connection.CreateCommand();
        command.CommandText = "INSERT INTO Sessions(id, userId) VALUES($id, $userId)";
        command.Parameters.AddWithValue("$id", session64);
        command.Parameters.AddWithValue("$userId", name);
      }

      return session64;
    }
  }
}

public class EntityDb
{
  private SqliteConnection _connection;
  private string _id;

  public EntityDb(string id)
  {
    _id = id;
    _connection = ProjectDbStatics.CreateConnection(id);
    _connection.Open();
  }

  public void InsertEntity<T>(int kind, string id, T content) where T : class
  {
    var contentBlob = ProjectDbStatics.SerializeEntity(content);

    var command = _connection.CreateCommand();
    command.CommandText = "INSERT INTO Entities(kind, id, content) VALUES($kind, $id, $content)";
    command.Parameters.AddWithValue("$kind", kind);
    command.Parameters.AddWithValue("$id", id);
    command.Parameters.AddWithValue("$content", contentBlob);

    var inserted = command.ExecuteNonQuery();
    if (inserted != 1)
    {
      throw new ArgumentException("Cannot insert");
    }
  }

  public void InsertEntityRaw(int kind, string id, string content)
  {
    var command = _connection.CreateCommand();
    command.CommandText = "INSERT INTO Entities(kind, id, content) VALUES($kind, $id, $content)";
    command.Parameters.AddWithValue("$kind", kind);
    command.Parameters.AddWithValue("$id", id);
    command.Parameters.AddWithValue("$content", content);

    var inserted = command.ExecuteNonQuery();
    if (inserted != 1)
    {
      throw new ArgumentException("Cannot insert");
    }
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
    var contentBlob = ProjectDbStatics.SerializeEntity(content);

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

  internal List<string> LoadEntities(int kind)
  {
    var ent = new List<string>();

    var command = _connection.CreateCommand();
    command.CommandText = "SELECT * FROM Entities WHERE kind == $kind";
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
        return ProjectDbStatics.DeserializeEntity<T>(data);
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
