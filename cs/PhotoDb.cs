using System.Data.SqlTypes;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.Sqlite;

public class PhotoEntry
{
  public Int64 folderId { get; set; }
  public Int64 id { get; set; }
  public string hash { get; set; }
  public string fileName { get; set; }
  public string fileExt { get; set; }
  public Int64 fileSize { get; set; }
  public int favorite { get; set; }
  public int stars { get; set; }
  public string color { get; set; }
  public int width { get; set; }
  public int height { get; set; }
  // MagickFormat value
  public int format { get; set; }
  public string originalDateTime { get; set; }
  public string originalHash { get; set; }
  public string stackHash { get; set; }
  public string imageId { get; set; }
}

public class UpdateString
{
  string val;
}

public class AddFolderRequest
{
  public string folder { get; set; }
}

public class ResultResponse
{
  public string result { get; set; }
}

public class AddFolderResponse
{
  public string jobId { get; set; }
  public string result { get; set; }
}

public class RescanFolderRequest
{
  public Int64 folderId { get; set; }
}

public class RescanFolderResponse
{
  public string jobId { get; set; }
  public string result { get; set; }
}

public class UpdatePhotoRequest
{
  public string hash { get; set; }
  public int? favorite { get; set; }
  public int? stars { get; set; }
  public UpdateString? color { get; set; }
  public UpdateString? originalHash { get; set; }
  public UpdateString? stackHash { get; set; }
}

public class UpdatePhotoResponse
{
  public string Error { get; set; }
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

public static class ReaderExt
{
  public static string ReadString(this SqliteDataReader reader, string name)
  {
    var val = reader[name];
    if (val == DBNull.Value)
    {
      return null;
    }
    else
    {
      return (string)val;
    }
  }
  public static Int32 ReadInt32(this SqliteDataReader reader, string name)
  {
    var val = reader[name];
    if (val == DBNull.Value)
    {
      return 0;
    }
    else
    {
      return unchecked((int)(Int64)val);
    }
  }
  public static Int64 ReadInt64(this SqliteDataReader reader, string name)
  {
    var val = reader[name];
    if (val == DBNull.Value)
    {
      return 0;
    }
    else
    {
      return unchecked((Int64)val);
    }
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
    command.CommandText = "INSERT INTO Photos(folder, filename, fileext, filesize, hash, fav, width, height, format, originalDt, imageId) VALUES($folder, $filename, $fileext, $filesize, $hash, $fav, $width, $height, $format, $originalDt, $imageId)";
    command.Parameters.AddWithValue("$folder", entry.folderId);
    command.Parameters.AddWithValue("$filename", entry.fileName);
    command.Parameters.AddWithValue("$fileext", entry.fileExt);
    command.Parameters.AddWithValue("$filesize", entry.fileSize);
    AddStringValue(command, "$imageId", entry.imageId);
    command.Parameters.AddWithValue("$hash", entry.hash);
    command.Parameters.AddWithValue("$fav", entry.favorite);
    command.Parameters.AddWithValue("$width", entry.width);
    command.Parameters.AddWithValue("$height", entry.height);
    command.Parameters.AddWithValue("$format", entry.format);
    AddStringValue(command, "$originalDt", entry.originalDateTime);

    var inserted = command.ExecuteNonQuery();
    if (inserted != 1)
    {
      throw new ArgumentException("Cannot insert");
    }
  }

  private void AddStringValue(SqliteCommand command, string name, string val)
  {
    if (val != null)
    {
      command.Parameters.AddWithValue(name, val);
    }
    else
    {
      command.Parameters.AddWithValue(name, DBNull.Value);
    }
  }

  public void UpdatePhotoFileInfo(PhotoEntry entry)
  {
    var command = _connection.CreateCommand();

    command.CommandText = "UPDATE Photos SET hash=$hash, filesize=$filesize, imageId=$imageId, width=$width, height=$height, format=$format, originalDt=$originalDt WHERE folder == $folderId AND filename == $filename AND fileext == $fileext";

    command.Parameters.AddWithValue("$folderId", entry.folderId);
    command.Parameters.AddWithValue("$filename", entry.fileName);
    command.Parameters.AddWithValue("$fileext", entry.fileExt);
    command.Parameters.AddWithValue("$hash", entry.hash);
    command.Parameters.AddWithValue("$filesize", entry.fileSize);
    AddStringValue(command, "$imageId", entry.imageId);
    command.Parameters.AddWithValue("$width", entry.width);
    command.Parameters.AddWithValue("$height", entry.height);
    command.Parameters.AddWithValue("$format", entry.format);
    AddStringValue(command, "$originalDt", entry.originalDateTime);

    var updated = command.ExecuteNonQuery();
    if (updated != 1)
    {
      throw new ArgumentException("Cannot update");
    }
  }
  public bool HasPhoto(Int64 folderId, string fileName, string fileExt)
  {
    var command = _connection.CreateCommand();
    command.CommandText = "SELECT * FROM Photos WHERE folder == $folder and filename == $filename and fileext == $fileext";
    command.Parameters.AddWithValue("$folder", folderId);
    command.Parameters.AddWithValue("$filename", fileName);
    command.Parameters.AddWithValue("$fileext", fileExt);

    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return true;
      }
    }

    return false;
  }

  private static PhotoEntry ReadEntry(SqliteDataReader reader)
  {
    var dtStr = reader.ReadString("originalDt");
    DateTime? dt = null;
    if (dtStr != null)
    {
      CultureInfo provider = CultureInfo.InvariantCulture;
      dt = DateTime.ParseExact(dtStr, "yyyy:MM:dd HH:mm:ss", provider);
    }

    var en = new PhotoEntry()
    {
      folderId = (Int64)reader["folder"],
      id = (Int64)reader["id"],
      hash = (string)reader["hash"],
      fileName = (string)reader["filename"],
      fileExt = (string)reader["fileext"],
      fileSize = (Int64)reader["filesize"],
      favorite = reader.ReadInt32("fav"),
      stars = reader.ReadInt32("stars"),
      color = reader.ReadString("color"),
      width = unchecked((int)(Int64)reader["width"]),
      height = unchecked((int)(Int64)reader["height"]),
      format = unchecked((int)(Int64)reader["format"]),
      originalDateTime = dt?.ToString(),
      originalHash = reader.ReadString("originalHash"),
      stackHash = reader.ReadString("stackHash"),
      imageId = reader.ReadString("imageId"),
    };

    return en;
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
      command.CommandText = "SELECT * FROM Photos WHERE folder == $folder order by originalDt";
      command.Parameters.AddWithValue("$folder", folderId);
    });
  }

  public List<PhotoEntry> GetCollection(Int64 collectionId)
  {
    return SelectPhotos((command) =>
    {
      command.CommandText = "SELECT * FROM Collection INNER JOIN Photos ON Collection.hash == Photos.hash  WHERE id == $id";
      command.Parameters.AddWithValue("$id", collectionId);
    });
  }

  public List<PhotoEntry> SelectPhotos(Action<SqliteCommand> func)
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

  public bool UpdatePhoto(UpdatePhotoRequest updateReqest)
  {
    var command = _connection.CreateCommand();
    var setFields = "";
    if (updateReqest.favorite != null)
    {
      setFields += "fav = $fav";
      command.Parameters.AddWithValue("$fav", updateReqest.favorite);
    }
    if (updateReqest.stars != null)
    {
      setFields += "stars = $stars";
      command.Parameters.AddWithValue("$stars", updateReqest.stars);
    }
    if (updateReqest.color != null)
    {
      setFields += "color = $color";
      command.Parameters.AddWithValue("$color", updateReqest.color);
    }
    command.CommandText = $"UPDATE Photos SET {setFields} WHERE hash == $hash";
    command.Parameters.AddWithValue("$hash", updateReqest.hash);

    var updated = command.ExecuteNonQuery();
    if (updated != 1)
    {
      return false;
    }

    return true;
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
    var currentThumbnails = GetThumbnail(hash);
    if (currentThumbnails.Count > 0)
    {
      var delCommand = _connection.CreateCommand();
      delCommand.CommandText = "DELETE FROM Thumbnails WHERE hash == $hash";
      delCommand.Parameters.AddWithValue("$hash", hash);
      var deleted = delCommand.ExecuteNonQuery();
      if (deleted == 0)
      {
        Console.WriteLine("Cannot delete thumbnail");
      }
    }

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
