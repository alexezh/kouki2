
using System.Drawing;
using ImageMagick;


public class AddDeviceRequest
{
  public string name { get; set; }
}

public class ConnectDeviceRequest
{
  public string name { get; set; }
}

public class ConnectDeviceResponse : ResultResponse
{
  public Int64 archiveFolderId { get; set; }
  public Int64 deviceCollectionId { get; set; }
}

public class GetSyncListRequest
{
  public Int64 deviceFolderId { get; set; }
  public string[] files { get; set; }
}

public class GetSyncListResponse : ResultResponse
{
  public string[] files { get; set; }
}

public class UploadFileResponse : ResultResponse
{
  public string hash { get; set; }
}

public class AddFileRequest
{
  public Int64 archiveFolderId { get; set; }
  public Int64 deviceCollectionId { get; set; }
  public string hash { get; set; }
  public string fileName { get; set; }
  public bool favorite { get; set; }
}

public class DeviceEntry
{
  public Int64 id;
  public string name;
  public Int64 archiveFolderId { get; set; }
  public Int64 deviceCollectionId { get; set; }
}

/// <summary>
/// for each device we maintain two folders : library and archive
/// library contains all photos which should be kept on device
/// archive contains all photos captured on device. When user takes photo 
/// on device, it first goes to library. And then we remove it. So all new photos
/// go to both archive and library folders
/// </summary>
public class MobileSync
{
  private static System.Security.Cryptography.SHA1 sha1 = System.Security.Cryptography.SHA1.Create();
  private static Dictionary<string, Stream> _pendingImages = new Dictionary<string, Stream>();

  public static string ComputeHash(Stream stm)
  {
    stm.Position = 0;
    var hash = sha1.ComputeHash(stm);
    return Convert.ToHexString(hash);
  }

  /// <summary>
  /// add one filesystem folder for archive and one collection
  /// for photos to include on device
  /// </summary>
  public static bool AddDevice(PhotoFs fs, AddDeviceRequest request)
  {
    try
    {
      var archivePath = Path.GetFullPath(request.name, fs.DevicePath);
      Directory.CreateDirectory(archivePath);
      var folderId = fs.PhotoDb.AddSourceFolder(archivePath, "device");
      if (folderId == null)
      {
        throw new ArgumentException("Cannot create folder");
      }

      var collId = fs.PhotoDb.AddCollection(request.name);
      if (collId == null)
      {
        throw new ArgumentException("Cannot create collection");
      }

      fs.PhotoDb.AddDevice(request.name, folderId.Value, collId.Value);

      return true;
    }
    catch (Exception e)
    {
      Console.Error.WriteLine("AddDevice failed: " + e.Message);
      return false;
    }
  }

  public static ConnectDeviceResponse ConnectDevice(PhotoFs fs, ConnectDeviceRequest request)
  {
    try
    {
      var devices = fs.PhotoDb.GetDevices(request.name);
      if (devices.Count != 1)
      {
        throw new ArgumentException("Device not found");
      }

      return new ConnectDeviceResponse()
      {
        result = ResultResponse.Ok,
        archiveFolderId = devices[0].archiveFolderId,
        deviceCollectionId = devices[0].deviceCollectionId
      };
    }
    catch (Exception e)
    {
      Console.Error.WriteLine("ConnectDevice failed: " + e.Message);
      return new ConnectDeviceResponse()
      {
        result = ResultResponse.Failed
      };
    }
  }

  public static List<DeviceEntry> GetDevices(PhotoFs fs)
  {
    return fs.PhotoDb.GetDevices();
  }

  public static async Task<UploadFileResponse> UploadFile(Stream stm)
  {
    try
    {
      var memStm = new MemoryStream();
      await stm.CopyToAsync(memStm);

      memStm.Position = 0;
      var hash = ComputeHash(memStm);
      _pendingImages[hash] = memStm;
      return new UploadFileResponse()
      {
        hash = hash,
        result = ResultResponse.Ok
      };
    }
    catch (Exception e)
    {
      Console.Error.WriteLine("UploadFile: " + e.ToString());
      return new UploadFileResponse()
      {
        result = ResultResponse.Failed
      };
    }
  }

  public static ResultResponse AddFile(PhotoFs fs, AddFileRequest request)
  {
    try
    {
      if (!_pendingImages.TryGetValue(request.hash, out var stream))
      {
        return new ResultResponse() { result = "no_stream" };
      }

      var fileName = Path.GetFileNameWithoutExtension(request.fileName);
      var fileExt = Path.GetExtension(request.fileName);

      var entries = fs.PhotoDb.GetPhotoByName(request.archiveFolderId, fileName, fileExt);
      if (entries.Count > 0)
      {
        if (entries[0].hash == request.hash)
        {
          Console.WriteLine("Duplicate hash");
          return new ResultResponse() { result = ResultResponse.Ok };
        }
      }

      // save file to folder
      var folder = fs.PhotoDb.GetFolder(request.archiveFolderId);
      var destPath = Path.GetFullPath(request.fileName, folder.path);

      stream.Position = 0;

      using (var destStm = File.OpenWrite(destPath))
      {
        stream.CopyTo(destStm);
      }

      var importer = new FileImporter(fs.PhotoDb, fs.ThumbnailDb);

      // add file to archive folder
      var photoId = importer.AddFile(folder.id, destPath, request.favorite);
      if (!photoId.HasValue)
      {
        return new ResultResponse() { result = "cannot_add_photo" };
      }

      var dt = DateTime.UtcNow;
      // and now add to collection
      fs.PhotoDb.AddCollectionItem(request.deviceCollectionId, photoId.Value, dt.ToBinary());

      return new ResultResponse() { result = ResultResponse.Ok };
    }
    catch (Exception e)
    {
      return new ResultResponse() { result = ResultResponse.Failed };
    }
  }

  public static string[] GetSyncList(PhotoDb db, GetSyncListRequest request)
  {
    // var deviceFolderId = 0;

    // var photoList = db.GetPhotosByFolder(deviceFolderId);
    // var photoMap = new Dictionary<string, PhotoEntry>();
    // foreach (var photo in photoList)
    // {
    //   photoMap.Add(photo.fileName + photo.fileExt, photo);
    // }

    // var uploadPhoto = new List<string>();
    // foreach (var file in request.files)
    // {
    //   db.GetPhotosByFolder()
    // }
    return request.files;
  }
}