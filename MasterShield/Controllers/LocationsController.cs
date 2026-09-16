using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MasterShield.Controllers;

[ApiController]
[Route("api/locations")]
public class LocationsController : ControllerBase
{
    private readonly ILocationService _locationService;
    private readonly IFileStorageService _storage;

    public LocationsController(ILocationService locationService, IFileStorageService storage)
    {
        _locationService = locationService;
        _storage = storage;
    }

    [HttpGet("campaign/{campaignId:guid}")]
    public async Task<ActionResult<IEnumerable<Location>>> GetByCampaign(Guid campaignId) =>
        Ok(await _locationService.GetByCampaignAsync(campaignId));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Location>> GetById(Guid id)
    {
        var location = await _locationService.GetByIdAsync(id);
        return location is null ? NotFound() : Ok(location);
    }

    [HttpPost]
    public async Task<ActionResult<Location>> Create([FromBody] Location location)
    {
        if (string.IsNullOrWhiteSpace(location.Name) || location.CampaignId == Guid.Empty)
            return BadRequest("Name and CampaignId are required.");

        var created = await _locationService.CreateAsync(location);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Location location)
    {
        if (id != location.Id)
            return BadRequest("Route id does not match payload id.");

        return await _locationService.UpdateAsync(location) ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await _locationService.DeleteAsync(id) ? NoContent() : NotFound();

    [HttpPut("{id:guid}/tags")]
    public async Task<IActionResult> SetTags(Guid id, [FromBody] IEnumerable<Guid> tagIds) =>
        await _locationService.SetTagsAsync(id, tagIds) ? NoContent() : NotFound();

    /// <summary>Uploads the location's image (thumbnail and battle map) and stores its URI.</summary>
    [HttpPost("{id:guid}/image")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<string>> UploadImage(
        Guid id, [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null)
            return BadRequest("A file is required.");

        var location = await _locationService.GetByIdAsync(id);
        if (location is null)
            return NotFound();

        string uri;
        try
        {
            uri = await _storage.SaveAsync(file, "locations", cancellationToken);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }

        _storage.Delete(location.ImageUri);
        location.ImageUri = uri;
        await _locationService.UpdateAsync(location);
        return Ok(new { imageUri = uri });
    }
}
