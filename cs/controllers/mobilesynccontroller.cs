using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace kouki2.Controllers;

public class MobileSyncController : Controller
{
  [HttpPost]
  public async Task<ResultResponse> AddDevice()
  {
    string result;
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<AddDeviceRequest>(content);

      result = MobileSync.AddDevice(PhotoFs.Instance, request) ? "ok" : "failed";
    }

    return new ResultResponse() { result = result };
  }

  [HttpPost]
  public async Task<ConnectDeviceResponse> ConnectDevice()
  {
    string result;
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<ConnectDeviceRequest>(content);

      result = MobileSync.ConnectDevice(PhotoFs.Instance, request) ? "ok" : "failed";
    }

    return new ConnectDeviceResponse() { };
  }

  [HttpPost]
  public async Task<GetSyncListResponse> GetSyncList()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<GetSyncListRequest>(content);

      var files = MobileSync.GetSyncList(PhotoFs.Instance.PhotoDb, request);

      return new GetSyncListResponse() { result = "ok", files = files };
    }
  }

  [HttpPost]
  public async Task<UploadFileResponse> UploadFile()
  {
    var hash = MobileSync.UploadFile(Request.Body);

    return new UploadFileResponse() { hash = hash };
  }
}
