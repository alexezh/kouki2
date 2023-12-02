using System.Data.SqlTypes;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
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
  public int Width { get; set; }
  public int Height { get; set; }
  // MagickFormat value
  public int Format { get; set; }
  public string OriginalDateTime { get; set; }
  public string OriginalHash { get; set; }
  public string StackHash { get; set; }
}

public class ThumbnailEntry
{
  public string Hash { get; set; }
  public int Width { get; set; }
  public int Height { get; set; }
  public byte[] Data { get; set; }
}

public class FolderEntry
{
  public Int64 Id { get; set; }
  public string Path { get; set; }
}

public class FolderQueries
{
  private SqliteConnection _connection;

  public FolderQueries(SqliteConnection connection)
  {
    _connection = connection;
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

  public List<FolderEntry> GetSourceFolders()
  {
    var command = _connection.CreateCommand();
    command.CommandText = "SELECT * FROM SourceFolders";

    var folders = new List<FolderEntry>();
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        folders.Add(new FolderEntry()
        {
          Id = (Int64)reader["id"],
          Path = (string)reader["path"]
        });
      }
    }

    return folders;
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
}

public class CollectionTable
{
  private SqliteConnection _connection;
  public CollectionTable(SqliteConnection connection)
  {
    _connection = connection;
  }
  public List<PhotoEntry> GetCollection(Int64 collectionId)
  {
    return PhotoDb.SelectPhotos(_connection, (command) =>
    {
      command.CommandText = "SELECT * FROM Collection INNER JOIN Photos ON Collection.hash == Photos.hash  WHERE id == $id";
      command.Parameters.AddWithValue("$id", collectionId);
    });
  }
}

public class PhotoDb
{
  private SqliteConnection _connection;
  public readonly FolderQueries folders;
  private string _path;

  public PhotoDb(string path)
  {
    _path = path;
    _connection = PhotoDbStatics.CreateConnection(path);
    _connection.Open();
    folders = new FolderQueries(_connection);
  }

  public void AddPhoto(PhotoEntry entry)
  {
    var command = _connection.CreateCommand();
    command.CommandText = "INSERT INTO Photos(folder, name, hash, fav, width, height, format, originalDt) VALUES($folder, $name, $hash, $fav, $width, $height, $format, $originalDt)";
    command.Parameters.AddWithValue("$folder", entry.FolderId);
    command.Parameters.AddWithValue("$name", entry.Name);
    command.Parameters.AddWithValue("$hash", entry.Hash);
    command.Parameters.AddWithValue("$fav", entry.Favorite);
    command.Parameters.AddWithValue("$width", entry.Width);
    command.Parameters.AddWithValue("$height", entry.Height);
    command.Parameters.AddWithValue("$format", entry.Format);
    if (entry.OriginalDateTime != null)
    {
      command.Parameters.AddWithValue("$originalDt", entry.OriginalDateTime);
    }
    else
    {
      command.Parameters.AddWithValue("$originalDt", DBNull.Value);
    }

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

  private static string DbValToString(object val)
  {
    if (val == DBNull.Value)
    {
      return null;
    }
    else
    {
      return (string)val;
    }
  }

  private static PhotoEntry ReadEntry(SqliteDataReader reader)
  {
    var en = new PhotoEntry()
    {
      FolderId = (Int64)reader["folder"],
      Id = (Int64)reader["id"],
      Hash = (string)reader["hash"],
      Name = (string)reader["name"],
      Width = unchecked((int)(Int64)reader["width"]),
      Height = unchecked((int)(Int64)reader["height"]),
      Format = unchecked((int)(Int64)reader["format"]),
      OriginalDateTime = DbValToString(reader["originalDt"]),
      OriginalHash = DbValToString(reader["originalHash"]),
      StackHash = DbValToString(reader["stackHash"]),
    };

    return en;
  }

  public List<PhotoEntry> GetPhotosByHash(string hash)
  {
    return SelectPhotos(_connection, (command) =>
    {
      command.CommandText = "SELECT * FROM Photos WHERE hash == $hash";
      command.Parameters.AddWithValue("$hash", hash);
    });
  }

  public List<PhotoEntry> GetPhotosByFolder(Int64 folderId)
  {
    return SelectPhotos(_connection, (command) =>
    {
      command.CommandText = "SELECT * FROM Photos WHERE folder == $folder";
      command.Parameters.AddWithValue("$folder", folderId);
    });
  }

  public List<PhotoEntry> GetAllPhotos()
  {
    return SelectPhotos(_connection, (command) =>
    {
      command.CommandText = "SELECT * FROM Photos";
    });
  }

  public static List<PhotoEntry> SelectPhotos(SqliteConnection connection, Action<SqliteCommand> func)
  {
    var command = connection.CreateCommand();
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
}

public class ThumbnailDb
{
  private SqliteConnection _connection;
  private string _path;

  public ThumbnailDb(string path)
  {
    _path = path;
    _connection = PhotoDbStatics.CreateConnection(path);
    _connection.Open();
  }


  public void AddThumbnail(string hash, int width, int height, byte[] data)
  {
    var command = _connection.CreateCommand();
    command.CommandText = "INSERT INTO Thumbnails(hash, width, height, data) VALUES($hash, $width, $height, $data)";
    command.Parameters.AddWithValue("$hash", hash);
    command.Parameters.AddWithValue("$width", width);
    command.Parameters.AddWithValue("$height", height);
    command.Parameters.AddWithValue("$data", data);

    var inserted = command.ExecuteNonQuery();
    if (inserted != 1)
    {
      throw new ArgumentException("Cannot insert");
    }
  }


  private ThumbnailEntry ReadEntry(SqliteDataReader reader)
  {
    var en = new ThumbnailEntry()
    {
      Hash = (string)reader["hash"],
      Width = unchecked((int)(Int64)reader["width"]),
      Height = unchecked((int)(Int64)reader["height"]),
      Data = (byte[])reader["data"],
    };

    return en;
  }

  public List<ThumbnailEntry> GetThumbnail(string hash)
  {
    var command = _connection.CreateCommand();
    command.CommandText = "SELECT * FROM Thumbnails WHERE hash == $hash";
    command.Parameters.AddWithValue("$hash", hash);

    var entries = new List<ThumbnailEntry>();
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        entries.Add(ReadEntry(reader));
      }
    }

    return entries;
  }
}
