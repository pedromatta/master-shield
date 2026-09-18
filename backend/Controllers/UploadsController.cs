using Daedala.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Daedala.Controllers;

/// <summary>
/// Accepts binary uploads from the GM client and returns the relative URI to persist on
/// the owning entity (actor portrait, location map, category icon, rule/note attachment).
/// </summary>
[ApiController]
[Route("api/uploads")]
public class UploadsController : ControllerBase
{
    private readonly IFileStorageService _storage;

    public UploadsController(IFileStorageService storage)
    {
        _storage = storage;
    }

    /// <summary>
    /// Stores one file. <paramref name="scope"/> selects the destination folder; it must be
    /// one of <see cref="IFileStorageService.AllowedScopes"/>.
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<UploadResult>> Upload(
        [FromForm] IFormFile file,
        [FromQuery] string scope,
        CancellationToken cancellationToken)
    {
        if (file is null)
            return BadRequest("A file is required.");

        try
        {
            var uri = await _storage.SaveAsync(file, scope, cancellationToken);
            return Created(uri, new UploadResult(uri, file.FileName, file.ContentType, file.Length));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    public record UploadResult(string Uri, string FileName, string ContentType, long SizeInBytes);
}
