using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace kouki2.Controllers;


/// <summary>
/// manages list of source folders
/// creates list of output folders which contain links or different versions
/// </summary>
public class PhotoLibraryController : Controller
{
  [HttpPost]
  public async Task<ImportFolderResponse> AddSourceFolder()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<ImportFolderRequest>(content);

      var id = JobRunner.Instance.RunJob(new ImportJob(request.folder));

      return new ImportFolderResponse() { result = "Ok", jobId = id };
    }
  }

  [HttpPost]
  public async Task<ImportFolderResponse> RescanSourceFolder()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<RescanFolderRequest>(content);

      var id = JobRunner.Instance.RunJob(new RescanJob(request.folderId));

      return new ImportFolderResponse() { result = "Ok", jobId = id };
    }
  }

  [HttpPost]
  public async Task<ResultResponse> CheckSourceFolder()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<ImportFolderRequest>(content);

      bool exists = PhotoFs.Instance.CheckSourceFolder(new FolderName(request.folder));

      return new ResultResponse() { result = (exists) ? "Ok" : "NotFound" };
    }
  }

  [HttpGet]
  public IEnumerable<FolderEntry> GetSourceFolders()
  {
    return PhotoFs.Instance.GetSourceFolders();
  }

  [HttpGet]
  public IEnumerable<CollectionItem> GetFolder(Int64 id)
  {
    return PhotoFs.Instance.GetFolder(id);
  }

  [HttpGet]
  public IEnumerable<CollectionItem> GetCollectionItems(Int64 id)
  {
    return PhotoFs.Instance.GetCollectionItems(id);
  }

  [HttpGet]
  public IEnumerable<PhotoEntry> GetLibrary()
  {
    return PhotoFs.Instance.GetLibrary();
  }

  [HttpPost]
  public async Task<ResultResponse> AddCollectionItems(Int64 id)
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<CollectionItem[]>(content);

      bool exists = PhotoFs.Instance.AddCollectionItems(id, request);

      return new ResultResponse() { result = (exists) ? "Ok" : "NotFound" };
    }
  }

  [HttpPost]
  public async Task<ResultResponse> RemoveCollectionItems(Int64 id)
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<CollectionItem[]>(content);

      bool exists = PhotoFs.Instance.AddCollectionItems(id, request);

      return new ResultResponse() { result = (exists) ? "Ok" : "NotFound" };
    }
  }

  [HttpGet]
  public IEnumerable<CollectionEntry> GetCollections()
  {
    return PhotoFs.Instance.GetCollections();
  }

  [HttpPost]
  public async Task<AddCollectionResponse> AddCollection()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<AddCollectionRequest>(content);

      CollectionEntry coll = PhotoFs.Instance.AddCollection(request);
      if (coll != null)
      {
        return new AddCollectionResponse() { collection = coll, result = "Ok" };
      }
      else
      {
        return new AddCollectionResponse() { collection = null, result = "Failed" };
      }
    }
  }

  // get string as resource
  [HttpGet]
  public IActionResult GetImage(string id)
  {
    // for now we only accept * pattern
    return PhotoFs.Instance.GetImageFile(id);
  }

  // get string as resource
  [HttpPost]
  public async Task<UpdatePhotoResponse> UpdatePhotos(string id)
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<UpdatePhotoRequest[]>(content);

      PhotoFs.Instance.UpdatePhotos(request);

      return new UpdatePhotoResponse() { error = "ok" };
    }
  }

  [HttpGet]
  public IActionResult GetThumbnail(string id)
  {
    // for now we only accept * pattern
    return PhotoFs.Instance.GetThumbnailFile(id);
  }
}

