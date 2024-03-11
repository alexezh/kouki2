using System.Numerics;
using ImageMagick;
using Shipwreck.Phash.Imaging;

public class ByteImage : IByteImage
{
  private byte[] _data;
  private OrientationType _orientation;

  public int Width { get; }
  public int Height { get; }

  public byte this[int x, int y]
  {
    get
    {
      return _data[y * Width + x];
    }
  }

  /*
  
    1        2       3      4         5            6           7          8

  888888  888888      88  88      8888888888  88                  88  8888888888
  88          88      88  88      88  88      88  88          88  88      88  88
  8888      8888    8888  8888    88          8888888888  8888888888          88
  88          88      88  88
  88          88  888888  888888
  
  */
  public ByteImage(int w, int h, OrientationType orientation, byte[] data)
  {
    _data = data;
    Width = w;
    Height = h;
    _orientation = orientation;
  }

  public ByteImage ToLuminanceImage()
  {
    byte[] r = new byte[Width * Height];
    var yc = new Vector3(66, 129, 25);
    var i = 0;
    var reverseX = (_orientation == OrientationType.TopRight);
    int srcPixelStride = (reverseX) ? -3 : 3;

    switch (_orientation)
    {
      // rotate 90 clockwise
      case OrientationType.RightTop:
        for (var dy = 0; dy < Width; dy++)
        {
          // start from bottom line, move up
          int srcLineStart = (Width * Height - Width + dy);

          for (var dx = 0; dx < Height; dx++)
          {
            i = (srcLineStart - dx * Width) * 3;
            Vector3 sv;
            sv.Z = _data[i++]; // B
            sv.Y = _data[i++]; // G
            sv.X = _data[i++]; // R

            r[dy * Height + dx] = (byte)(((int)(Vector3.Dot(yc, sv) + 128) >> 8) + 16);
          }
        }

        return new ByteImage(Height, Width, OrientationType.LeftTop, r);

      case OrientationType.TopRight:
        for (var dy = 0; dy < Height; dy++)
        {
          int srcLineStart = (dy + 1) * Width * 3;

          for (var dx = 0; dx < Width; dx++)
          {
            i = srcLineStart + dx * 3;
            Vector3 sv;
            sv.Z = _data[i++]; // B
            sv.Y = _data[i++]; // G
            sv.X = _data[i++]; // R

            r[dy * Width + dx] = (byte)(((int)(Vector3.Dot(yc, sv) + 128) >> 8) + 16);
          }
        }

        return new ByteImage(Width, Height, OrientationType.LeftTop, r);

      default:
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

        return new ByteImage(Width, Height, OrientationType.LeftTop, r);
    }
  }
}

