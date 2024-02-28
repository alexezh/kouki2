using System.Numerics;
using Shipwreck.Phash.Imaging;

public class ByteImage : IByteImage
{
  private byte[] _data;

  public int Width { get; }
  public int Height { get; }

  public byte this[int x, int y]
  {
    get
    {
      return _data[y * Width + x];
    }
  }

  public ByteImage(int w, int h, byte[] data)
  {
    _data = data;
    Width = w;
    Height = h;
  }

  public ByteImage ToLuminanceImage()
  {
    byte[] r = new byte[Width * Height];
    var yc = new Vector3(66, 129, 25);
    var i = 0;
    for (var dy = 0; dy < Height; dy++)
    {
      for (var dx = 0; dx < Width; dx++)
      {
        Vector3 sv;
        sv.Z = _data[i++]; // B
        sv.Y = _data[i++]; // G
        sv.X = _data[i++]; // R

        r[dy * Width + dx] = (byte)(((int)(Vector3.Dot(yc, sv) + 128) >> 8) + 16);
      }
    }

    return new ByteImage(Width, Height, r);
  }
}

