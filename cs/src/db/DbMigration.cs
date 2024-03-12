using Microsoft.Data.Sqlite;

static public class DbMigration
{
  static public void Migrate(long userVersion, SqliteConnection connection)
  {
    if (userVersion < 2)
    {
      PhotoDbStatics.AddColumn(connection, "Photos", "alttext", "TEXT");
    }

    if (userVersion < 3)
    {
      PhotoDbStatics.CreateTable(connection, "CREATE VIRTUAL TABLE AltText USING fts5(text, photoId UNINDEXED)");
    }

    if (userVersion < 4)
    {
      PhotoDbStatics.AddColumn(connection, "Photos", "alttexte", "BLOB");
    }

    if (userVersion < 5)
    {
      ConvertPhotoTime2(connection);
    }

    if (userVersion < 6)
    {
      PhotoDbStatics.AddColumn(connection, "Photos", "originalId", "INTEGER");
      PhotoDbStatics.AddColumn(connection, "Photos", "originalCorrelation", "NUMBER");
    }

    if (userVersion < 7)
    {
      ConvertFavs(connection);

      userVersion = 7;
      ReaderExt.ExecuteVoidCommand(connection, (command) =>
      {
        command.CommandText = $"PRAGMA user_version = {userVersion};";
      });
    }
  }

  private static void ConvertPhotoTime2(SqliteConnection connection)
  {
    PhotoDbStatics.AddColumn(connection, "Photos", "originalDt2", "INTEGER");
    PhotoDbStatics.AddColumn(connection, "Photos", "importedDt2", "INTEGER");
    PhotoDbStatics.CreateIndex(connection, "CREATE INDEX IF NOT EXISTS `PhotoOriginalDt` ON `Photos` (`originalDt2` ASC);");

    // might take a while
    var items = new List<Tuple<Int64, DateTime?, DateTime?>>();
    {
      var command = connection.CreateCommand();
      command.CommandText = $"SELECT id, originalDt, importedDt FROM Photos;";
      using (var reader = command.ExecuteReader())
      {
        while (reader.Read())
        {
          items.Add(new Tuple<long, DateTime?, DateTime?>(
            reader.ReadInt64("id"),
          reader.ReadMagicTime("originalDt"),
          reader.ReadMagicTime("importedDt")));
        }
      }
    }

    foreach (var item in items)
    {
      Int64 original = item.Item2 != null ? item.Item2.Value.ToBinary() : 0;
      Int64 updated = item.Item3 != null ? item.Item3.Value.ToBinary() : 0;

      ReaderExt.ExecuteVoidCommand(connection, (command) =>
      {
        command.CommandText = $"UPDATE Photos SET originalDt2={original}, importedDt2={updated} WHERE id == {item.Item1};";
      });
    }
  }

  private static void ConvertFavs(SqliteConnection connection)
  {
    PhotoDbStatics.AddColumn(connection, "Photos", "reactions", "TEXT");

    var items = new List<Tuple<Int64, Int64>>();
    {
      var command = connection.CreateCommand();
      command.CommandText = $"SELECT id, fav FROM Photos;";
      using (var reader = command.ExecuteReader())
      {
        while (reader.Read())
        {
          items.Add(new Tuple<Int64, Int64>(
            reader.ReadInt64("id"),
            reader.ReadInt64("fav")));
        }
      }
    }

    foreach (var item in items)
    {
      if (item.Item2 == 0)
      {
        continue;
      }

      string reactions = (item.Item2 > 0) ? "3" : "4";
      ReaderExt.ExecuteVoidCommand(connection, (command) =>
      {
        command.CommandText = $"UPDATE Photos SET reactions={reactions} WHERE id == {item.Item1};";
      });
    }
  }
}