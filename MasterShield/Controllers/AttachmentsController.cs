using MasterShield.Data;
using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Controllers;

/// <summary>
/// Manages file attachments for actors, rules, locations and notes. Files are stored on
/// the server (see <see cref="IFileStorageService"/>); only the resulting URI is persisted.
/// </summary>
[ApiController]
[Route("api/attachments")]
public class AttachmentsController : ControllerBase
{
    private readonly MasterShieldContext _context;
    private readonly IFileStorageService _storage;

    public AttachmentsController(MasterShieldContext context, IFileStorageService storage)
    {
        _context = context;
        _storage = storage;
    }

    /// <summary>Lists attachments belonging to one owner entity.</summary>
    [HttpGet("{ownerType}/{ownerId:guid}")]
    public async Task<ActionResult<IEnumerable<Attachment>>> List(string ownerType, Guid ownerId)
    {
        var normalized = (ownerType ?? string.Empty).ToLowerInvariant();
        var query = _context.Attachments.AsNoTracking().AsQueryable();

        query = normalized switch
        {
            "actor" => query.Where(a => a.ActorId == ownerId),
            "rule" => query.Where(a => a.RuleId == ownerId),
            "location" => query.Where(a => a.LocationId == ownerId),
            "note" => query.Where(a => a.NoteId == ownerId),
            _ => null!
        };

        if (query is null)
            return BadRequest("ownerType must be one of: actor, rule, location, note.");

        return Ok(await query.OrderBy(a => a.FileName).ToListAsync());
    }

    /// <summary>Uploads a file and links it to the owner entity in one request.</summary>
    [HttpPost("{ownerType}/{ownerId:guid}")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<Attachment>> Upload(
        string ownerType,
        Guid ownerId,
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null)
            return BadRequest("A file is required.");

        var normalized = (ownerType ?? string.Empty).ToLowerInvariant();
        if (normalized is not ("actor" or "rule" or "location" or "note"))
            return BadRequest("ownerType must be one of: actor, rule, location, note.");

        if (!await OwnerExistsAsync(normalized, ownerId))
            return NotFound($"The {normalized} was not found.");

        string uri;
        try
        {
            uri = await _storage.SaveAsync(file, ScopeFor(normalized), cancellationToken);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }

        var attachment = new Attachment
        {
            Id = Guid.NewGuid(),
            FileName = file.FileName,
            FileUri = uri,
            ContentType = file.ContentType,
            SizeInBytes = file.Length
        };

        switch (normalized)
        {
            case "actor": attachment.ActorId = ownerId; break;
            case "rule": attachment.RuleId = ownerId; break;
            case "location": attachment.LocationId = ownerId; break;
            case "note": attachment.NoteId = ownerId; break;
        }

        _context.Attachments.Add(attachment);
        await _context.SaveChangesAsync();
        return StatusCode(StatusCodes.Status201Created, attachment);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var attachment = await _context.Attachments.FirstOrDefaultAsync(a => a.Id == id);
        if (attachment is null)
            return NotFound();

        _storage.Delete(attachment.FileUri);
        _context.Attachments.Remove(attachment);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private Task<bool> OwnerExistsAsync(string ownerType, Guid ownerId) => ownerType switch
    {
        "actor" => _context.Actors.AnyAsync(a => a.Id == ownerId),
        "rule" => _context.Rules.AnyAsync(r => r.Id == ownerId),
        "location" => _context.Locations.AnyAsync(l => l.Id == ownerId),
        "note" => _context.Notes.AnyAsync(n => n.Id == ownerId),
        _ => Task.FromResult(false)
    };

    private static string ScopeFor(string ownerType) => ownerType switch
    {
        "actor" => "actors",
        "rule" => "rules",
        "location" => "locations",
        "note" => "notes",
        _ => "notes"
    };
}
