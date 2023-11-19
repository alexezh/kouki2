using System.Security.Cryptography;
using System.Text;

public static class PasswordHash
{
  const int HashSize = 32;
  public static string Compute(byte[] seed, string pwd)
  {
    var pwdData = Encoding.UTF8.GetBytes(pwd);

    var hash = Rfc2898DeriveBytes.Pbkdf2(pwdData, seed, 20, HashAlgorithmName.SHA256, HashSize);
    return Convert.ToBase64String(hash);
  }

  public static bool Verify(string pwd, string seed64, string hash64)
  {
    var seed = Convert.FromBase64String(seed64);
    var pwdData = Encoding.UTF8.GetBytes(pwd);
    var hash1 = Convert.FromBase64String(hash64);

    var hash2 = Rfc2898DeriveBytes.Pbkdf2(pwdData, seed, 20, HashAlgorithmName.SHA256, HashSize);
    if (hash1.Length != HashSize || hash1.Length != hash2.Length)
    {
      return false;
    }

    for (int i = 0; i < hash1.Length; i++)
      if (hash1[i] != hash2[i])
        return false;

    return true;
  }
}

