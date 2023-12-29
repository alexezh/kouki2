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
  public string error { get; set; }
}

public class ThumbnailEntry
{
  public string hash { get; set; }
  public int width { get; set; }
  public int height { get; set; }
  public byte[] data { get; set; }
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
  private string _path;

  public SqliteConnection Connection => _connection;

  public PhotoDb(string path)
  {
    _path = path;
    _connection = PhotoDbStatics.CreateConnection(path);
    _connection.Open();
  }

  public Int64 AddPhoto(PhotoEntry entry)
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

    /*
    command.CommandText = "INSERT INTO SourceFolders(path) VALUES($path) RETURNING id";
    command.Parameters.AddWithValue("$path", path);

    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return (Int64)reader["id"];
      }
    }
    */

    return 0;
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
      originalDateTime = dt?.ToString("o"),
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

  public List<PhotoEntry> GetPhotosById(Int64 id)
  {
    return SelectPhotos((command) =>
    {
      command.CommandText = "SELECT * FROM Photos WHERE id == $id";
      command.Parameters.AddWithValue("$id", id);
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

  public Int64? InsertWithId(string table, (string, object val)[] values)
  {
    var command = _connection.CreateCommand();
    command.CommandText = $"INSERT INTO {table}({String.Join(",", values.Select(x => x.Item1))}) VALUES({String.Join(",", values.Select(x => "$" + x.Item1))}) RETURNING id";
    foreach (var val in values)
    {
      command.Parameters.AddWithValue("$" + val.Item1, val.Item2);
    }

    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return (Int64)reader["id"];
      }
    }

    return null;

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

public class FolderEntry
{
  public Int64 id { get; set; }
  public string path { get; set; }
  public string kind { get; set; }
}

public class CollectionEntry
{
  public Int64 id { get; set; }
  public string name { get; set; }
  public string kind { get; set; }
}

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
    var command = self.Connection.CreateCommand();
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
    return self.InsertWithId("SourceFolders", values);
  }
}
public static class CollectionsQueriesExt
{
  public static List<PhotoEntry> GetCollectionItems(this PhotoDb self, Int64 collectionId)
  {
    return self.SelectPhotos((command) =>
    {
      command.CommandText = "SELECT * FROM CollectionItems INNER JOIN Photos ON CollectionItems.id == Photos.id  WHERE id == $id";
      command.Parameters.AddWithValue("$id", collectionId);
    });
  }

  public static Int64? AddCollection(this PhotoDb self, string name, string kind = "user")
  {
    (string, object)[] values = { ("name", name), ("kind", kind) };
    return self.InsertWithId("Collections", values);
  }

  public static Int64? AddCollectionItem(this PhotoDb self, Int64 collectionId, Int64 photoId, Int64 dt)
  {
    (string, object)[] values = { ("id", collectionId), ("photoId", photoId), ("updateDt", dt) };
    return self.InsertWithId("CollectionItems", values);
  }

  public static List<CollectionEntry> GetCollections(this PhotoDb self)
  {
    var command = self.Connection.CreateCommand();
    command.CommandText = "SELECT * FROM Collections";

    var collections = new List<CollectionEntry>();
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        collections.Add(new CollectionEntry()
        {
          id = (Int64)reader["id"],
          name = (string)reader["name"],
          kind = (string)reader["kind"]
        });
      }
    }

    return collections;
  }
}

public static class DeviceQueriesExt
{
  public static Int64? AddDevice(this PhotoDb self, string name, Int64 folderId, Int64 collId)
  {
    (string, object)[] values = { ("name", name), ("archiveFolderId", folderId), ("deviceCollectionId", collId) };
    return self.InsertWithId("Devices", values);
  }
  public static List<DeviceEntry> GetDevices(this PhotoDb self, string deviceName = null)
  {
    var command = self.Connection.CreateCommand();

    if (deviceName != null)
    {
      command.CommandText = "SELECT * FROM Devices WHERE name==$name";
      command.Parameters.AddWithValue("$name", deviceName);
    }
    else
    {
      command.CommandText = "SELECT * FROM Devices";
    }

    var devices = new List<DeviceEntry>();
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        devices.Add(new DeviceEntry()
        {
          id = (Int64)reader["id"],
          name = (string)reader["name"],
          deviceCollectionId = (Int64)reader["deviceCollectionId"],
          archiveFolderId = (Int64)reader["archiveFolderId"],
        });
      }
    }

    return devices;
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
      hash = (string)reader["hash"],
      width = unchecked((int)(Int64)reader["width"]),
      height = unchecked((int)(Int64)reader["height"]),
      data = (byte[])reader["data"],
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
