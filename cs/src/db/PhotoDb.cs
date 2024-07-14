using System.Drawing;
using System.Globalization;
using System.Text.Json.Serialization;
using Microsoft.Data.Sqlite;

public class PhotoEntry
{
  public Int64 folderId { get; set; }
  public Int64 id { get; set; }
  public string hash { get; set; }
  public string fileName { get; set; }
  public string fileExt { get; set; }
  public Int64 fileSize { get; set; }
  public string reactions { get; set; }
  public string reactionsDt { get; set; }
  public bool hidden { get; set; }
  public int stars { get; set; }
  public string color { get; set; }
  public int width { get; set; }
  public int height { get; set; }
  // MagickFormat value
  public int format { get; set; }
  public string originalDt { get; set; }
  public string originalHash { get; set; }
  public Int64 stackId { get; set; }
  public Int64 originalId { get; set; }
  public double originalCorrelation { get; set; }
  public string altText { get; set; }
  [JsonIgnore]
  public byte[] phash;
}

public class MinPhotoEntry
{
  public Int64 id;
  public string hash;
  public Int64 stackId;
  public Int64 originalId;
  public double originalCorrelation;
  public byte[] phash;
  public Int64 fileSize;
}

public class UpdatePhotoRequest
{
  public Int64 id { get; set; }
  public string hash { get; set; }
  public int? favorite { get; set; }
  public bool? hidden { get; set; }
  public int? stars { get; set; }
  public UpdateString? color { get; set; }
  public Int64? stackId { get; set; }
  public Int64? originalId { get; set; }
  public double? originalCorrelation { get; set; }
  public string altText { get; set; }
  public string reactions { get; set; }
}

public class TextSearchRequest
{
  public string collKind { get; set; }
  public Int64 collId { get; set; }
  public string search { get; set; }
  public string startDt { get; set; }
}

public class UpdatePhotoResponse : ResultResponse
{
  public string error { get; set; }
}

public class GetLibraryRequest
{
  public Int64 minId { get; set; }
}

public class GetPhotosRequest
{
  public Int64 minId { get; set; }
  public string startDt { get; set; }

  public Int64[] photoIds { get; set; }

  public Int64 collectionId { get; set; }
}

public class AddCollectionRequest
{
  public string kind { get; set; }
  public string name { get; set; }
  public string createDt { get; set; }
  public string metadata { get; set; }
}

public class UpdateCollectionRequest
{
  public Int64 totalPhotos { get; set; }
}

public class AddCollectionResponse : ResultResponse
{
  public CollectionEntry collection { get; set; }
}

public class ThumbnailEntry
{
  public string hash { get; set; }
  public int width { get; set; }
  public int height { get; set; }
  public byte[] data { get; set; }
}

public static class CommandExt
{
  public static void AddStringValue(this SqliteCommand self, string name, string val)
  {
    if (val != null)
    {
      self.Parameters.AddWithValue(name, val);
    }
    else
    {
      self.Parameters.AddWithValue(name, DBNull.Value);
    }
  }

  public static void AddBlobValue(this SqliteCommand self, string name, byte[] val)
  {
    if (val != null)
    {
      self.Parameters.AddWithValue(name, val);
    }
    else
    {
      self.Parameters.AddWithValue(name, DBNull.Value);
    }
  }

  public static void AddIntTimeValue(this SqliteCommand self, string name, string timeStr)
  {
    DateTime t = DateTime.Parse(timeStr);
    self.Parameters.AddWithValue(name, t.ToBinary());
  }
}
public static class ReaderExt
{

  public static Int64 ExecuteIntCommand(SqliteConnection connection, Action<SqliteCommand> cmd, string name)
  {
    var command = connection.CreateCommand();
    cmd(command);
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return (Int64)reader[name];
      }
    }

    return 0;
  }

  public static void ExecuteVoidCommand(SqliteConnection connection, Action<SqliteCommand> cmd)
  {
    var command = connection.CreateCommand();
    cmd(command);
    using (var reader = command.ExecuteReader())
    {
    }
  }

  public static byte[] ReadBlob(this SqliteDataReader reader, string name)
  {
    var val = reader[name];
    if (val == DBNull.Value)
    {
      return null;
    }
    else
    {
      return (byte[])val;
    }
  }
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
  public static bool ReadBoolean(this SqliteDataReader reader, string name)
  {
    var val = reader[name];
    if (val == DBNull.Value)
    {
      return false;
    }
    else
    {
      return ((Int64)val != 0) ? true : false;
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

  public static double ReadDouble(this SqliteDataReader reader, string name)
  {
    var val = reader[name];
    if (val == DBNull.Value)
    {
      return 0;
    }
    else
    {
      if (val.GetType() == typeof(Int64))
      {
        return unchecked((Int64)val);
      }
      else if (val.GetType() == typeof(Double))
      {
        return unchecked((double)val);
      }
      else
      {
        throw new ArgumentException("Unknown type");
      }
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

  public static string ParseMagicTime(string magicTime)
  {
    CultureInfo provider = CultureInfo.InvariantCulture;
    return DateTime.ParseExact(magicTime, "yyyy:MM:dd HH:mm:ss", provider).ToString("o");
  }

  public static string ReadIntTime(this SqliteDataReader reader, string name)
  {
    var val = reader.ReadInt64(name);
    return DateTime.FromBinary(val).ToString("o");
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
    command.CommandText = "INSERT INTO Photos(folder, filename, fileext, filesize, hash, hidden, width, height, format, originalDt2, phash) VALUES($folder, $filename, $fileext, $filesize, $hash, $hidden, $width, $height, $format, $originalDt2, $phash) RETURNING id";
    command.Parameters.AddWithValue("$folder", entry.folderId);
    command.Parameters.AddWithValue("$filename", entry.fileName);
    command.Parameters.AddWithValue("$fileext", entry.fileExt);
    command.Parameters.AddWithValue("$filesize", entry.fileSize);
    command.AddBlobValue("$phash", entry.phash);
    command.Parameters.AddWithValue("$hash", entry.hash);
    command.Parameters.AddWithValue("$hidden", entry.hidden);
    command.Parameters.AddWithValue("$reactions", entry.reactions);
    command.Parameters.AddWithValue("$width", entry.width);
    command.Parameters.AddWithValue("$height", entry.height);
    command.Parameters.AddWithValue("$format", entry.format);
    command.AddIntTimeValue("$originalDt2", entry.originalDt);

    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return (Int64)reader["id"];
      }
    }

    return 0;
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
      hidden = reader.ReadBoolean("hidden"),
      reactions = reader.ReadString("reactions"),
      reactionsDt = reader.ReadIntTime("reactionsDt"),
      stars = reader.ReadInt32("stars"),
      color = reader.ReadString("color"),
      width = unchecked((int)(Int64)reader["width"]),
      height = unchecked((int)(Int64)reader["height"]),
      format = unchecked((int)(Int64)reader["format"]),
      originalDt = reader.ReadIntTime("originalDt2"),
      originalHash = reader.ReadString("originalHash"),
      stackId = reader.ReadInt64("stackId"),
      originalId = reader.ReadInt64("originalId"),
      originalCorrelation = reader.ReadDouble("originalCorrelation"),
      altText = reader.ReadString("alttext"),
      phash = reader.ReadBlob("phash"),
    };

    if (en.reactions != null)
    {
      ;
    }
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

public class CollectionEntry
{
  public Int64 id { get; set; }
  public string name { get; set; }
  public string kind { get; set; }
  public string createDt { get; set; }
  public string metadata { get; set; }
}
