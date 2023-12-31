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