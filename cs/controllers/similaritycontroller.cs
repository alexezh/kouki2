using System.Text;
using System.Text.Json;
using ImageMagick;
using Microsoft.AspNetCore.Mvc;
using Shipwreck.Phash;

namespace kouki2.Controllers;

public class IdPair
{
  public Int64 left { get; set; }
  public Int64 right { get; set; }
}

public class GetCorrelationRequest
{
  public IdPair[] photos { get; set; }
}

public class GetCorrelationResponse : ResultResponse
{
  public float[] corrections { get; set; }
}

/// <summary>
/// manages list of source folders
/// creates list of output folders which contain links or different versions
/// </summary>
public class SimilarityController : Controller
{
  public static void RegisterRoutes(WebApplication app)
  {
    app.MapControllerRoute(
        name: "Similarity",
        pattern: "/api/{controller=Similarity}/{action=GetCorrelation}");
  }

  [HttpPost]
  public async Task<GetCorrelationResponse> GetCorrelation()
  {
    try
    {
      using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
      {
        string content = await reader.ReadToEndAsync();
        var request = JsonSerializer.Deserialize<GetCorrelationRequest>(content);

        var correlations = new List<float>();
        foreach (var pair in request.photos)
        {
          var left = PhotoFs.Instance.PhotoDb.GetPhotosById(pair.left);
          var right = PhotoFs.Instance.PhotoDb.GetPhotosById(pair.right);

          if (left[0].phash == null || right[0].phash == null)
          {
            correlations.Add(-1);
          }
          else
          {
            correlations.Add(CrossCorrelation.GetCrossCorrelation(left[0].phash, right[0].phash));
          }
        }

        return new GetCorrelationResponse() { result = ResultResponse.Ok, corrections = correlations.ToArray() };
      }
    }
    catch (Exception e)
    {
      return new GetCorrelationResponse() { result = ResultResponse.Failed };
    }
  }
}
