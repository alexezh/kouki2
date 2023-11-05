using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace barksrv.Controllers;

public class LoginController : Controller
{
  [HttpPost]
  public async Task<WireLoginResponse> Login()
  {
    using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
    {
      string content = await reader.ReadToEndAsync();
      WireLoginRequest request = JsonSerializer.Deserialize<WireLoginRequest>(content);

      var session = UserDbStatics.LoginUser(request.name, request.pwd);

      if (session == null)
      {
        return new WireLoginResponse() { url = null, session = null };
      }
      else
      {
        return new WireLoginResponse() { url = "/digshell.html", session = session };
      }
    }
  }
}