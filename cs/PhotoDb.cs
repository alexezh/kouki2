using System.Data.SqlTypes;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;

public class PhotoEntry
{
  public Int64 FolderId { get; set; }
  public Int64 Id { get; set; }
  public string Hash { get; set; }
  public string Name { get; set; }
  public bool Favorite { get; set; }
  public int Stars { get; set; }
  public int Color { get; set; }
}


public class FolderEntry
{
  public Int64 Id { get; set; }
  public string Path { get; set; }
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

  public FolderEntry GetFolder(Int64 id)
  {
    var command = _connection.CreateCommand();
    command.CommandText = "SELECT * FROM SourceFolders WHERE id == $id";
    command.Parameters.AddWithValue("$id", id);
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return new FolderEntry()
        {
          Id = id,
          Path = (string)reader["path"]
        };
      }
    }

    return null;
  }

  public void AddPhoto(Int64 folderId, string fileName, string hash, bool fav)
  {
    var command = _connection.CreateCommand();
    command.CommandText = "INSERT INTO Photos(folder, name, hash, fav) VALUES($folder, $name, $hash, $fav)";
    command.Parameters.AddWithValue("$folder", folderId);
    command.Parameters.AddWithValue("$name", fileName);
    command.Parameters.AddWithValue("$hash", hash);
    command.Parameters.AddWithValue("$fav", fav);

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

  private PhotoEntry ReadEntry(SqliteDataReader reader)
  {
    var en = new PhotoEntry()
    {
      FolderId = (Int64)reader["folder"],
      Id = (Int64)reader["id"],
      Hash = (string)reader["hash"],
      Name = (string)reader["name"]
    };

    return en;
  }

  private List<PhotoEntry> SelectPhotos(Action<SqliteCommand> func)
  {
    var command = _connection.CreateCommand();
    func(command);

    var entries = new List<PhotoEntry>();
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        entries.Add(ReadEntry(reader));
      }
    }

    return entries;
  }

  public List<PhotoEntry> GetPhotosByHash(string hash)
  {
    return SelectPhotos((command) =>
    {
      command.CommandText = "SELECT * FROM Photos WHERE hash == $hash";
      command.Parameters.AddWithValue("$hash", hash);
    });
  }

  public List<PhotoEntry> GetPhotosByFolder(Int64 folderId)
  {
    return SelectPhotos((command) =>
    {
      command.CommandText = "SELECT * FROM Photos WHERE folder == $folder";
      command.Parameters.AddWithValue("$folder", folderId);
    });
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
