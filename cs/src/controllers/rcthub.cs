using System.Text.Json;
using Microsoft.AspNetCore.SignalR;

public class RctHub : Hub
{
  public async Task SendUpdate(string user, string message)
  {
    Console.WriteLine("Received message " + user);
    await Clients.All.SendAsync("OnUpdate", user, message);
  }
  public async Task UpdateAvatarPosition(string sessionId, string message)
  {
    // RctUpdateAvatarPosition msg = JsonSerializer.Deserialize<RctUpdateAvatarPosition>(message);

    // Project world = ProjectCollection.Instance.GetProject(msg.worldId);
    // if (world == null)
    // {
    //   return;
    // }

    //world.Avatars.UpdatePosition(msg);

    await Clients.All.SendAsync("OnUpdateAvatarPosition", sessionId, message);
  }
}
