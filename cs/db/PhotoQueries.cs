public static class PhotoQueriesExt
{
  public static List<PhotoEntry> GetPhotoByName(this PhotoDb self, Int64 folderId, string fileName, string fileExt)
  {
    return self.SelectPhotos((command) =>
    {
      command.CommandText = "SELECT * FROM Photos WHERE folder == $folder and filename == $filename and fileext == $fileext";
      command.Parameters.AddWithValue("$folder", folderId);
      command.Parameters.AddWithValue("$filename", fileName);
      command.Parameters.AddWithValue("$fileext", fileExt);
    });
  }

  public static List<PhotoEntry> GetPhotosByHash(this PhotoDb self, string hash)
  {
    return self.SelectPhotos((command) =>
    {
      command.CommandText = "SELECT * FROM Photos WHERE hash == $hash";
      command.Parameters.AddWithValue("$hash", hash);
    });
  }

  public static List<PhotoEntry> GetPhotosById(this PhotoDb self, Int64 id)
  {
    return self.SelectPhotos((command) =>
    {
      command.CommandText = "SELECT * FROM Photos WHERE id == $id";
      command.Parameters.AddWithValue("$id", id);
    });
  }

  public static List<CollectionItem> GetPhotosByFolder(this PhotoDb self, Int64 folderId)
  {
    var command = self.Connection.CreateCommand();
    command.CommandText = "SELECT id, originalDt FROM Photos WHERE folder == $folder order by originalDt";
    command.Parameters.AddWithValue("$folder", folderId);

    var entries = new List<CollectionItem>();
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        var entry = new CollectionItem()
        {
          photoId = reader.ReadInt64("id"),
          updateDt = reader.ReadMagicTime("originalDt")?.ToString("o"),
        };
        entries.Add(entry);
      }
    }

    return entries;
  }

  public static Int64? InsertWithId(this PhotoDb self, string table, (string, object val)[] values)
  {
    var command = self.Connection.CreateCommand();
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

  public static bool Insert(this PhotoDb self, string table, (string, object val)[] values)
  {
    var command = self.Connection.CreateCommand();
    command.CommandText = $"INSERT INTO {table}({String.Join(",", values.Select(x => x.Item1))}) VALUES({String.Join(",", values.Select(x => "$" + x.Item1))})";
    foreach (var val in values)
    {
      command.Parameters.AddWithValue("$" + val.Item1, val.Item2);
    }

    var inserted = command.ExecuteNonQuery();
    if (inserted != 1)
    {
      return false;
    }
    return true;
  }

  public static bool UpdatePhoto(this PhotoDb self, UpdatePhotoRequest updateReqest)
  {
    var command = self.Connection.CreateCommand();
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
