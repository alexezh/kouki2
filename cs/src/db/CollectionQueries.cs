using Microsoft.Data.Sqlite;

public static class CollectionsQueriesExt
{

  public static List<CollectionItem> GetLibraryItems(this PhotoDb self)
  {
    var command = self.Connection.CreateCommand();
    command.CommandText = "SELECT id, originalDt2 FROM Photos ORDER BY originalDt2 DESC";

    var items = new List<CollectionItem>();
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        var item = new CollectionItem();
        item.photoId = reader.ReadInt64("id");
        item.updateDt = reader.ReadIntTime("originalDt2");
        items.Add(item);
      }
    }

    return items;
  }

  public static List<Tuple<Int64, byte[]>> GetLibraryAltTextEmbedding(this PhotoDb self)
  {
    var command = self.Connection.CreateCommand();
    command.CommandText = "select Photos.alttexte, id from Photos where Photos.alttexte is not null;";

    var items = new List<Tuple<Int64, byte[]>>();
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        var item = new Tuple<long, byte[]>(reader.ReadInt64("id"), reader.ReadBlob("alttexte"));
        items.Add(item);
      }
    }

    return items;
  }

  public static List<CollectionItem> GetCollectionItems(this PhotoDb self, Int64 id)
  {
    var command = self.Connection.CreateCommand();
    command.CommandText = "SELECT * FROM CollectionItems WHERE id == $id";
    command.Parameters.AddWithValue("$id", id);

    var items = new List<CollectionItem>();
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        var item = new CollectionItem();
        item.photoId = reader.ReadInt64("photoId");
        item.updateDt = reader.ReadIntTime("updateDt");
        items.Add(item);
      }
    }

    return items;
  }

  public static Int64? AddCollection(this PhotoDb self, string name, string kind = "user", Int64 dt = 0, string metadata = null)
  {
    return AddCollection(self.Connection, name, kind, dt, metadata);
  }

  public static Int64? AddCollection(SqliteConnection connection, string name, string kind = "user", Int64 dt = 0, string metadata = null)
  {
    ;
    if (metadata != null)
    {
      (string, object)[] values = { ("name", name), ("kind", kind), ("createDt", dt), ("metadata", metadata) };
      return PhotoQueriesExt.InsertWithId(connection, "Collections", values);
    }
    else
    {
      (string, object)[] values = { ("name", name), ("kind", kind), ("createDt", dt) };
      return PhotoQueriesExt.InsertWithId(connection, "Collections", values);
    }
  }

  public static Int64? AddCollectionItem(this PhotoDb self, Int64 collectionId, Int64 photoId, Int64 dt)
  {
    (string, object)[] values = { ("id", collectionId), ("photoId", photoId), ("updateDt", dt) };
    return PhotoQueriesExt.InsertWithId(self.Connection, "CollectionItems", values);
  }

  public static CollectionEntry GetCollection(this PhotoDb self, Int64 collectionId)
  {
    var command = self.Connection.CreateCommand();
    command.CommandText = "SELECT * FROM Collections WHERE Id == $id";
    command.Parameters.AddWithValue("$id", collectionId);

    var collections = new List<CollectionEntry>();
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        return ReadCollectionEntry(reader);
      }
    }

    return null;
  }

  public static void UpdateCollection(this PhotoDb self, Int64 id, string metaStr)
  {
    ReaderExt.ExecuteVoidCommand(self.Connection, (command) =>
    {
      command.CommandText = $"UPDATE Collections SET metadata=$metadata WHERE id={id}";
      command.Parameters.AddWithValue("$metadata", metaStr);
    });
  }

  public static void ExecuteVoidCommand(SqliteConnection connection, Action<SqliteCommand> cmd)
  {
    var command = connection.CreateCommand();
    cmd(command);
    using (var reader = command.ExecuteReader())
    {
    }
  }



  public static List<CollectionEntry> GetCollections(this PhotoDb self)
  {
    return GetCollections(self.Connection);
  }

  private static CollectionEntry ReadCollectionEntry(SqliteDataReader reader)
  {
    return new CollectionEntry()
    {
      id = (Int64)reader["id"],
      name = (string)reader["name"],
      kind = (string)reader["kind"],
      createDt = reader.ReadIntTime("createDt"),
      metadata = reader.ReadString("metadata")
    };
  }

  public static List<CollectionEntry> GetCollections(SqliteConnection connection)
  {
    var command = connection.CreateCommand();
    command.CommandText = "SELECT * FROM Collections";

    var collections = new List<CollectionEntry>();
    using (var reader = command.ExecuteReader())
    {
      while (reader.Read())
      {
        collections.Add(ReadCollectionEntry(reader));
      }
    }

    return collections;
  }
}