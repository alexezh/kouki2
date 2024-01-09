public static class PHashQueries
{
  // public static Int64? GetFolderId(this PhotoDb self, string path)
  // {
  //   var command = self.Connection.CreateCommand();
  //   command.CommandText = "SELECT * FROM PHash WHERE id == $id";
  //   command.Parameters.AddWithValue("$path", path);
  //   using (var reader = command.ExecuteReader())
  //   {
  //     while (reader.Read())
  //     {
  //       return (Int64)reader["id"];
  //     }
  //   }

  //   return null;
  // }

  public static void AddDigest(this PhotoDb self, Int64 photoId, byte[] digest)
  {
    var command = self.Connection.CreateCommand();
    command.CommandText = "INSERT OR REPLACE INTO PHash(photoId, digest) VALUES($photoId, $digest)";
    command.Parameters.AddWithValue("$photoId", photoId);
    command.Parameters.AddWithValue("$digest", digest);

    var inserted = command.ExecuteNonQuery();
    if (inserted != 1)
    {
      throw new ArgumentException("Cannot insert");
    }
  }
}