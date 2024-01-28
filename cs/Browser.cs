using System.Diagnostics;
using System.Runtime.InteropServices;

public static class BrowserHelper
{
  public static void OpenBrowser(string url)
  {
    if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
    {
      Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
    }
    else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
    {
      Process.Start("xdg-open", url);
    }
    else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
    {
      Process.Start("open", url);
    }
  }
}