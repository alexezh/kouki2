using System.Data.SqlTypes;
using System.Globalization;
using System.Runtime.CompilerServices;
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

public class AddCollectionRequest
{
  public string kind { get; set; }
  public string name { get; set; }
  public string createDt { get; set; }
}

public class AddCollectionResponse : ResultResponse
{
  public Int64 id { get; set; }
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

  public static DateTime? ReadMagicTime(this SqliteDataReader reader, string name)
  {
    var dtStr = reader.ReadString("originalDt");
    if (dtStr == null)
    {
      return null;
    }

    CultureInfo provider = CultureInfo.InvariantCulture;
    return DateTime.ParseExact(dtStr, "yyyy:MM:dd HH:mm:ss", provider);
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
      originalDateTime = reader.ReadMagicTime("originalDt")?.ToString("o"),
      originalHash = reader.ReadString("originalHash"),
      stackHash = reader.ReadString("stackHash"),
      imageId = reader.ReadString("imageId"),
    };

    return en;
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
