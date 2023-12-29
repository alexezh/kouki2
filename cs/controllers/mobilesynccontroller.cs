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
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<ConnectDeviceRequest>(content);

      return MobileSync.ConnectDevice(PhotoFs.Instance, request);
    }
  }

  [HttpGet]
  public IEnumerable<DeviceEntry> GetDevices()
  {
    return MobileSync.GetDevices(PhotoFs.Instance);
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
    return await MobileSync.UploadFile(Request.Body);
  }

  [HttpPost]
  public async Task<ResultResponse> AddFile()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      var request = JsonSerializer.Deserialize<AddFileRequest>(content);

      var resp = MobileSync.AddFile(PhotoFs.Instance, request);
      return resp;
    }
  }
}
