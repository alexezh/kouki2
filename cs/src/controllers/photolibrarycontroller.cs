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
  internal static void RegisterRoutes(WebApplication app)
  {
    app.MapControllerRoute(
        name: "GetCollectionItems",
        pattern: "/api/{controller=PhotoLibrary}/{action=GetCollectionItems}/{id}");

    app.MapControllerRoute(
        name: "AddCollectionItems",
        pattern: "/api/{controller=PhotoLibrary}/{action=AddCollectionItems}/{id}");

    app.MapControllerRoute(
        name: "RemoveCollectionItems",
        pattern: "/api/{controller=PhotoLibrary}/{action=RemoveCollectionItems}/{id}");

    app.MapControllerRoute(
        name: "GetLibrary",
        pattern: "/api/{controller=PhotoLibrary}/{action=GetLibrary}");

    app.MapControllerRoute(
        name: "GetCollections",
        pattern: "/api/{controller=PhotoLibrary}/{action=GetCollections}");

    app.MapControllerRoute(
        name: "AddCollection",
        pattern: "/api/{controller=PhotoLibrary}/{action=AddCollection}");

    app.MapControllerRoute(
        name: "GetImage",
        pattern: "/api/{controller=PhotoLibrary}/{action=GetImage}/{id}");

    app.MapControllerRoute(
        name: "GetThumbnail",
        pattern: "/api/{controller=PhotoLibrary}/{action=GetThumbnail}/{id}");

    app.MapControllerRoute(
        name: "ImportSourceFolder",
        pattern: "/api/{controller=PhotoLibrary}/{action=ImportSourceFolder}");

    app.MapControllerRoute(
        name: "UpdatePhotos",
        pattern: "/api/{controller=PhotoLibrary}/{action=UpdatePhotos}");
  }

  [HttpPost]
  public async Task<ImportFolderResponse> ImportSourceFolder()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<ImportFolderRequest>(content);

      string id;
      if (request.folderId != 0)
      {
        id = JobRunner.Instance.RunJob(new RescanJob(request.folderId));
      }
      else
      {
        id = JobRunner.Instance.RunJob(new ImportJob(request));
      }

      return new ImportFolderResponse() { result = ResultResponse.Ok, jobId = id };
    }
  }

  [HttpGet]
  public IEnumerable<CollectionItem> GetCollectionItems(Int64 id)
  {
    return PhotoFs.Instance.GetCollectionItems(id);
  }

  [HttpPost]
  public async Task<IEnumerable<PhotoEntry>> GetLibrary()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<GetLibraryRequest>(content);

      return PhotoFs.Instance.GetLibrary(request.minId);
    }
  }

  [HttpPost]
  public async Task<ResultResponse> AddCollectionItems(Int64 id)
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<CollectionItem[]>(content);

      bool exists = PhotoFs.Instance.AddCollectionItems(id, request);

      return new ResultResponse() { result = (exists) ? ResultResponse.Ok : ResultResponse.NotFound };
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

      return new ResultResponse() { result = (exists) ? ResultResponse.Ok : ResultResponse.NotFound };
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
        return new AddCollectionResponse() { collection = coll, result = ResultResponse.Ok };
      }
      else
      {
        return new AddCollectionResponse() { collection = null, result = ResultResponse.Failed };
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

      return new UpdatePhotoResponse() { error = ResultResponse.Ok };
    }
  }

  [HttpGet]
  public IActionResult GetThumbnail(string id)
  {
    // for now we only accept * pattern
    return PhotoFs.Instance.GetThumbnailFile(id);
  }

  [HttpPost]
  public async Task<IEnumerable<CollectionItem>> TextSearch()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<TextSearchRequest>(content);

      return GenerateAltTextJob.TextSearch(request);
    }
  }
}

