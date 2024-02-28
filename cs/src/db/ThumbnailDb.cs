using Microsoft.Data.Sqlite;

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
