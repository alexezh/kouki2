using Microsoft.Data.Sqlite;

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
          updateDt = reader.ReadIntTime("originalDt2"),
        };
        entries.Add(entry);
      }
    }

    return entries;
  }

  public static Int64? InsertWithId(SqliteConnection connection, string table, (string, object val)[] values)
  {
    var command = connection.CreateCommand();
    command.CommandText = $"INSERT INTO {table}({String.Join(",", values.Select(x => x.Item1))}) VALUES({String.Join(",", values.Select(x => "$" + x.Item1))}) RETURNING id";
    foreach (var val in values)
    {
      command.Parameters.AddWithValue("$" + val.Item1, val.Item2);
    }

    try
    {
      using (var reader = command.ExecuteReader())
      {
        while (reader.Read())
        {
          return (Int64)reader["id"];
        }
      }
    }
    catch (SqliteException e)
    {
      // UNIQUE contraint failed
      if (e.SqliteErrorCode == 19)
      {
        return null;
      }

      throw;
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
    if (updateReqest.hidden != null)
    {
      setFields += "hidden = $hidden";
      command.Parameters.AddWithValue("$hidden", updateReqest.hidden);
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
    if (updateReqest.stackId != null)
    {
      setFields += "stackId = $stackId";
      command.Parameters.AddWithValue("$stackId", updateReqest.stackId);
    }

    if (updateReqest.altText != null)
    {
      setFields += "altText = $altText";
      command.Parameters.AddWithValue("$altText", updateReqest.altText);
    }

    if (setFields.Length > 0)
    {
      command.CommandText = $"UPDATE Photos SET {setFields} WHERE hash == $hash";
      command.Parameters.AddWithValue("$hash", updateReqest.hash);

      var updated = command.ExecuteNonQuery();
      if (updated != 1)
      {
        return false;
      }
    }
    else
    {
      return false;
    }

    return true;
  }

  public static void UpdatePhotoPHash(this PhotoDb self, Int64 photoId, byte[] phash)
  {
    var command = self.Connection.CreateCommand();

    command.CommandText = "UPDATE Photos SET phash=$phash WHERE id == $id";

    command.Parameters.AddWithValue("$id", photoId);
    command.AddBlobValue("$phash", phash);

    var updated = command.ExecuteNonQuery();
    if (updated != 1)
    {
      throw new ArgumentException("Cannot update");
    }
  }

  public static string GetPhotoAltText(this PhotoDb self, Int64 photoId)
  {
    var command = self.Connection.CreateCommand();

    command.CommandText = "SELECT alttext FROM Photos WHERE id == $id";
    command.Parameters.AddWithValue("$id", photoId);

    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return reader.ReadString("alttext");
      }
    }

    return null;
  }

  public static void UpdatePhotoAltText(this PhotoDb self, Int64 photoId, string altText)
  {
    var command = self.Connection.CreateCommand();

    command.CommandText = "UPDATE Photos SET alttext=$altText WHERE id == $id";

    command.Parameters.AddWithValue("$id", photoId);
    command.AddStringValue("$altText", altText);

    var updated = command.ExecuteNonQuery();
    if (updated != 1)
    {
      throw new ArgumentException("Cannot update");
    }
  }

  public static void UpdatePhotoAltTextEmbedding(this PhotoDb self, Int64 photoId, byte[] altTextEmb)
  {
    var command = self.Connection.CreateCommand();

    command.CommandText = "UPDATE Photos SET alttexte=$altTextEmb WHERE id == $id";

    command.Parameters.AddWithValue("$id", photoId);
    command.AddBlobValue("$altTextEmb", altTextEmb);

    var updated = command.ExecuteNonQuery();
    if (updated != 1)
    {
      throw new ArgumentException("Cannot update");
    }
  }

  public static List<Int64> SearchAltText(this PhotoDb self, string search)
  {
    var items = new List<Int64>();
    var command = self.Connection.CreateCommand();
    command.CommandText = "SELECT photoId FROM AltText WHERE text MATCH $search";
    command.Parameters.AddWithValue("$search", search);
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        items.Add((Int64)reader["photoId"]);
      }
    }
    return items;
  }

  public static void UpdateAltText(this PhotoDb self, Int64 photoId, string altText)
  {
    int updated = 0;
    {
      var command = self.Connection.CreateCommand();
      command.CommandText = "UPDATE AltText SET text=$text WHERE photoId==$id";
      command.Parameters.AddWithValue("$id", photoId);
      command.AddStringValue("$text", altText);

      try
      {
        updated = command.ExecuteNonQuery();
      }
      catch (Exception e)
      {
        Console.WriteLine("Cannot update alttext");
      }
    }

    if (updated != 1)
    {
      var command = self.Connection.CreateCommand();
      command.CommandText = "INSERT INTO AltText (text, photoId) VALUES($text, $id)";
      command.Parameters.AddWithValue("$id", photoId);
      command.AddStringValue("$text", altText);
      var added = command.ExecuteNonQuery();
      if (added != 1)
      {
        throw new ArgumentException("Cannot insert");
      }
    }
  }


  public static void UpdatePhotoFileInfo(this PhotoDb self, PhotoEntry entry)
  {
    var command = self.Connection.CreateCommand();

    command.CommandText = "UPDATE Photos SET hash=$hash, filesize=$filesize, phash=$phash, width=$width, height=$height, format=$format, originalDt2=$originalDt2 WHERE folder == $folderId AND filename == $filename AND fileext == $fileext";

    command.Parameters.AddWithValue("$folderId", entry.folderId);
    command.Parameters.AddWithValue("$filename", entry.fileName);
    command.Parameters.AddWithValue("$fileext", entry.fileExt);
    command.Parameters.AddWithValue("$hash", entry.hash);
    command.Parameters.AddWithValue("$filesize", entry.fileSize);
    command.AddBlobValue("$phash", entry.phash);
    command.Parameters.AddWithValue("$width", entry.width);
    command.Parameters.AddWithValue("$height", entry.height);
    command.Parameters.AddWithValue("$format", entry.format);
    command.AddIntTimeValue("$originalDt2", entry.originalDt);

    var updated = command.ExecuteNonQuery();
    if (updated != 1)
    {
      throw new ArgumentException("Cannot update");
    }
  }

  public static bool HasPhoto(this PhotoDb self, Int64 folderId, string fileName, string fileExt)
  {
    var command = self.Connection.CreateCommand();
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
}
