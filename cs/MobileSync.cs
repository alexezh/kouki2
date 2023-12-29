
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

public class ConnectDeviceResponse
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

public class UploadFileResponse
{
  public string hash { get; set; }
}

public class AddFileRequest
{
  public Int64 archiveFolderId { get; set; }
  public Int64 deviceCollection { get; set; }
  public string hash { get; set; }
  public string fileName { get; set; }
  public bool favorite { get; set; }
}

public class DeviceMetadata
{
  public string name;
  public string archivePath { get; set; }
  public Int64 phoneCollection { get; set; }
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
      var folderId = fs.PhotoDb.AddSourceFolder(archivePath);

      var collId = fs.PhotoDb.AddCollection(request.name);
      if (collId == null)
      {
        throw new ArgumentException("Cannot create collection");
      }

      fs.PhotoDb.AddDevice(request.name, folderId, collId.Value);

      return true;
    }
    catch (Exception e)
    {
      Console.Error.WriteLine("AddDevice failed: " + e.Message);
      return false;
    }
  }

  public static bool ConnectDevice(PhotoFs fs, ConnectDeviceRequest request)
  {
    try
    {
      var archivePath = Path.GetFullPath(request.name, fs.DevicePath);
      Directory.CreateDirectory(archivePath);
      var folderId = fs.PhotoDb.AddSourceFolder(archivePath);

      fs.PhotoDb.AddCollection(request.name);

      return true;
    }
    catch (Exception e)
    {
      Console.Error.WriteLine("AddDevice failed: " + e.Message);
      return false;
    }
  }

  public static string UploadFile(Stream stm)
  {
    stm.Position = 0;
    var hash = ComputeHash(stm);
    _pendingImages[hash] = stm;
    return hash;
  }

  public static ResultResponse AddFile(PhotoFs fs, AddFileRequest request)
  {
    try
    {
      if (!_pendingImages.TryGetValue(request.hash, out var stream))
      {
        return new ResultResponse() { result = "no_stream" };
      }

      // save file to folder
      var folder = fs.PhotoDb.GetFolder(request.archiveFolderId);
      var destPath = Path.GetFullPath(request.fileName, folder.Path);

      stream.Position = 0;

      using (var destStm = File.OpenWrite(destPath))
      {
        stream.CopyTo(destStm);
      }

      // add file to archive folder
      var photoId = Importer.AddFile(folder.Id, destPath, request.favorite, fs.PhotoDb, fs.ThumbnailDb);
      if (!photoId.HasValue)
      {
        return new ResultResponse() { result = "cannot_add_photo" };
      }

      var dt = DateTime.UtcNow;
      // and now add to collection
      fs.PhotoDb.AddCollectionItem(request.deviceCollection, photoId.Value, dt.ToBinary());

      return new ResultResponse() { result = "ok" };
    }
    catch (Exception e)
    {
      return new ResultResponse() { result = "failed" };
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