using System.Text.Json;

public class WireLoginRequest
{
  public string name { get; set; }
  public string pwd { get; set; }
}

public class WireLoginResponse
{
  public string url { get; set; }
  public string session { get; set; }
}

public class WireGetStringsRequest
{
  public string pattern { get; set; }
  public string[] keys { get; set; }
}

public class WireGetStringsResponse
{
  public WireString[] values { get; set; }
}

public class WireString
{
  public string key { get; set; }
  public string data { get; set; }
}

public class WireDict
{
  public string field { get; set; }
  public string value { get; set; }
}

public class WireGetDictRequest
{
  public string key { get; set; }
  public string[] fields { get; set; }
}

public class WireGetDictResponse
{
  public WireDict[] fields { get; set; }
}

public class WireSetDictRequest
{
  public string key { get; set; }
  public WireDict[] fields { get; set; }
}

public class WireIncrementRequest
{
  public string key { get; set; }
  public int count { get; set; }
}

public class WireIncrementResponse
{
  public int start { get; set; }
  public int count { get; set; }
}

enum ValueKind : int
{
  String = 0,
  Dict = 1
}

public class DictEntry
{
  public Dictionary<string, string> Data = new Dictionary<string, string>();
  public bool IsDirty;
}

public class Project
{
  private readonly Dictionary<string, DictEntry> _dictCache = new Dictionary<string, DictEntry>();
  private readonly Queue<DictEntry> _updateQueue = new Queue<DictEntry>();
  private EntityDb _db;
  public readonly string id;
  private static WireString[] _emptyStrings = new WireString[0];

  public static Project Load(string id)
  {
    var db = new EntityDb(id);
    return new Project(id, db);
  }

  public Project(string id, EntityDb db)
  {
    _db = db;
    this.id = id;
  }

  public IEnumerable<WireString> GetStringsPattern(string pattern)
  {
    // for now we only accept * pattern
    string prefix = pattern.Substring(0, pattern.Length - 1);

    var res = _db.LoadEntities2((int)ValueKind.String, prefix);
    return res.Select(x => new WireString() { key = x.Item1, data = x.Item2 });
  }

  public IEnumerable<WireString> GetStrings(string[] keys)
  {
    List<WireString> values = new List<WireString>();
    // for now we only accept * pattern
    foreach (var key in keys)
    {
      var res = _db.LoadEntity((int)ValueKind.String, key);
      if (res != null)
      {
        values.Add(new WireString() { key = key, data = res });
      }
    }

    return values;
  }

  // get string as resource
  public byte[] GetResource(string key)
  {
    // for now we only accept * pattern
    var res = _db.LoadEntity((int)ValueKind.String, key);
    if (res == null)
    {
      return null;
    }

    return Convert.FromBase64String(res);
  }

  public void SetString(string name, string data)
  {
    SetStringWorker(ValueKind.String, name, data);
  }

  public void SetStrings(WireString[] data)
  {
    foreach (var d in data)
    {
      SetStringWorker(ValueKind.String, d.key, d.data);
    }
  }

  private void SetStringWorker(ValueKind kind, string name, string data)
  {
    if (!_db.TryUpdateEntityRaw((int)kind, name, data))
    {
      _db.InsertEntityRaw((int)kind, name, data);
    }
  }

  public int Increment(string name, int count)
  {
    var res = _db.LoadEntity((int)ValueKind.String, name);
    int idx = 1;
    if (res != null)
    {
      idx = int.Parse(res);
    }

    int newIdx = idx + count;
    SetStringWorker(ValueKind.String, name, newIdx.ToString());

    return idx;
  }

  public IEnumerable<WireDict> GetDict(string key, string[] fields)
  {
    lock (_dictCache)
    {
      var entry = EnsureEntry(key);

      // null means no entry
      if (entry == null)
      {
        return null;
      }

      lock (entry)
      {
        if (fields == null)
        {
          return entry.Data.Select(x =>
          {
            return new WireDict() { field = x.Key, value = x.Value };
          });
        }
        else
        {
          return fields.Select(x =>
          {
            if (entry.Data.TryGetValue(x, out var value))
            {
              return new WireDict() { field = x, value = value };
            }
            else
            {
              return null;
            }
          }).Where(x => x != null);
        }
      }
    }
  }

  public void SetDict(string key, WireDict[] fields)
  {
    lock (_dictCache)
    {
      var entry = EnsureEntry(key, true);

      lock (entry)
      {
        foreach (var field in fields)
        {
          entry.Data[field.field] = field.value;
        }
      }

      if (!entry.IsDirty)
      {
        entry.IsDirty = true;
        _updateQueue.Enqueue(entry);
        var timer = new Timer((object state) => this.onSetDictTimer(key, entry), null, 5000, System.Threading.Timeout.Infinite);
      }
    }
  }

  private void onSetDictTimer(string key, DictEntry entry)
  {
    lock (entry)
    {
      var str = JsonSerializer.Serialize(entry.Data);
      SetStringWorker(ValueKind.Dict, key, str);
      entry.IsDirty = false;
    }
  }

  private DictEntry EnsureEntry(string key, bool create = false)
  {
    if (!_dictCache.TryGetValue(key, out var entry))
    {
      var res = _db.LoadEntity((int)ValueKind.Dict, key);

      if (res != null)
      {
        var dict = JsonSerializer.Deserialize<Dictionary<string, string>>(res);
        entry = new DictEntry() { Data = dict, IsDirty = false };
        _dictCache[key] = entry;
      }
      else
      {
        entry = (create) ? new DictEntry() : null;
        _dictCache[key] = entry;
      }
    }
    else if (entry == null && create)
    {
      entry = new DictEntry();
      _dictCache[key] = entry;
    }

    return entry;
  }
}

