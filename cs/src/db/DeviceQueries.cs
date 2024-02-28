public static class DeviceQueriesExt
{
  public static Int64? AddDevice(this PhotoDb self, string name, Int64 folderId, Int64 collId)
  {
    (string, object)[] values = { ("name", name), ("archiveFolderId", folderId), ("deviceCollectionId", collId) };
    return PhotoQueriesExt.InsertWithId(self.Connection, "Devices", values);
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
