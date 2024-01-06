public static class CollectionsQueriesExt
{

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
        item.updateDt = DateTime.FromBinary(reader.ReadInt64("updateDt")).ToString("o");
        items.Add(item);
      }
    }

    return items;
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