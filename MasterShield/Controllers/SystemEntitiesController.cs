using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MasterShield.Controllers;

/// <summary>
/// CRUD for the ready-made actors, locations, rules and notes a game system ships with, plus
/// bulk import and the copy operations that move content between systems and campaigns.
/// </summary>
[ApiController]
[Route("api/game-systems/{gameSystemId:guid}/entities")]
public class SystemEntitiesController : ControllerBase
{
    private readonly ISystemEntityService _service;
    private readonly IFileStorageService _storage;

    public SystemEntitiesController(ISystemEntityService service, IFileStorageService storage)
    {
        _service = service;
        _storage = storage;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SystemEntityTemplate>>> List(
        Guid gameSystemId, [FromQuery] string? kind = null) =>
        Ok(await _service.GetByGameSystemAsync(gameSystemId, kind));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SystemEntityTemplate>> Get(Guid id)
    {
        var template = await _service.GetByIdAsync(id);
        return template is null ? NotFound() : Ok(template);
    }

    [HttpPost]
    public async Task<ActionResult<SystemEntityTemplate>> Create(
        Guid gameSystemId, [FromBody] SystemEntityTemplate template)
    {
        try
        {
            template.GameSystemId = gameSystemId;
            var created = await _service.CreateAsync(template);
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    /// <summary>Imports a list of entities (for example a bestiary JSON) in one request.</summary>
    [HttpPost("import")]
    public async Task<ActionResult<IEnumerable<SystemEntityTemplate>>> Import(
        Guid gameSystemId, [FromBody] List<SystemEntityTemplate> templates)
    {
        if (templates is null || templates.Count == 0)
            return BadRequest("No entities were provided.");

        try
        {
            var created = await _service.CreateManyAsync(gameSystemId, templates);
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SystemEntityTemplate template)
    {
        if (id != template.Id)
            return BadRequest("Route id does not match payload id.");

        try
        {
            return await _service.UpdateAsync(template) ? NoContent() : NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await _service.DeleteAsync(id) ? NoContent() : NotFound();

    /// <summary>Uploads an image for a system entity and stores its URI on the template.</summary>
    [HttpPost("{id:guid}/image")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<IActionResult> UploadImage(Guid id, [FromForm] IFormFile file)
    {
        if (file is null)
            return BadRequest("A file is required.");

        var template = await _service.GetByIdAsync(id);
        if (template is null)
            return NotFound();

        string uri;
        try
        {
            uri = await _storage.SaveAsync(file, "system-entities");
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }

        _storage.Delete(template.ImageUri);
        template.ImageUri = uri;
        await _service.UpdateAsync(template);
        return Ok(new { imageUri = uri });
    }

    /// <summary>
    /// Copies the requested templates (or all of them) into a campaign as real content. This is
    /// how a campaign adopts its game system's bestiary, locations, rules and notes.
    /// </summary>
    [HttpPost("apply")]
    public async Task<ActionResult<SystemSeedResult>> Apply(
        Guid gameSystemId, [FromQuery] Guid campaignId, [FromBody] List<Guid>? templateIds = null)
    {
        try
        {
            var result = await _service.ApplyToCampaignAsync(gameSystemId, campaignId, templateIds);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    /// <summary>Captures existing campaign content into this system as reusable templates.</summary>
    [HttpPost("capture")]
    public async Task<ActionResult<IEnumerable<SystemEntityTemplate>>> Capture(
        Guid gameSystemId, [FromQuery] Guid campaignId, [FromBody] List<Guid>? entityIds = null)
    {
        try
        {
            var captured = await _service.CaptureFromCampaignAsync(gameSystemId, campaignId, entityIds);
            return StatusCode(StatusCodes.Status201Created, captured);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }
}
