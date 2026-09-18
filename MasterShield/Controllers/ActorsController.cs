using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MasterShield.Controllers;

[ApiController]
[Route("api/actors")]
public class ActorsController : ControllerBase
{
    private readonly IActorService _actorService;
    private readonly IFileStorageService _storage;

    public ActorsController(IActorService actorService, IFileStorageService storage)
    {
        _actorService = actorService;
        _storage = storage;
    }

    [HttpGet("campaign/{campaignId:guid}")]
    public async Task<ActionResult<IEnumerable<Actor>>> GetByCampaign(Guid campaignId)
    {
        var actors = await _actorService.GetByCampaignAsync(campaignId);
        return Ok(actors);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Actor>> GetById(Guid id)
    {
        var actor = await _actorService.GetByIdAsync(id);
        return actor is null ? NotFound() : Ok(actor);
    }

    [HttpPost]
    public async Task<ActionResult<Actor>> Create([FromBody] Actor actor)
    {
        if (string.IsNullOrWhiteSpace(actor.Name) || actor.CampaignId == Guid.Empty)
            return BadRequest("Name and CampaignId are required.");

        var created = await _actorService.CreateAsync(actor);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Actor actor)
    {
        if (id != actor.Id)
            return BadRequest("Route id does not match payload id.");

        return await _actorService.UpdateAsync(actor) ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await _actorService.DeleteAsync(id) ? NoContent() : NotFound();

    [HttpPut("{id:guid}/system-data")]
    public async Task<IActionResult> UpdateSystemData(Guid id, [FromBody] Dictionary<string, object> systemData)
    {
        var updated = await _actorService.UpdateSystemDataAsync(id, systemData);
        return updated ? NoContent() : NotFound();
    }

    [HttpPut("{id:guid}/tags")]
    public async Task<IActionResult> SetTags(Guid id, [FromBody] IEnumerable<Guid> tagIds) =>
        await _actorService.SetTagsAsync(id, tagIds) ? NoContent() : NotFound();

    /// <summary>Replaces the rules linked to this actor (abilities, traits, tactics, …).</summary>
    [HttpPut("{id:guid}/rules")]
    public async Task<IActionResult> SetLinkedRules(Guid id, [FromBody] IEnumerable<Guid> ruleIds) =>
        await _actorService.SetLinkedRulesAsync(id, ruleIds) ? NoContent() : NotFound();

    /// <summary>Uploads the actor's portrait and stores its URI on the record.</summary>
    [HttpPost("{id:guid}/image")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<string>> UploadImage(
        Guid id, [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null)
            return BadRequest("A file is required.");

        var actor = await _actorService.GetByIdAsync(id);
        if (actor is null)
            return NotFound();

        string uri;
        try
        {
            uri = await _storage.SaveAsync(file, "actors", cancellationToken);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }

        _storage.Delete(actor.ImageUri);
        actor.ImageUri = uri;
        await _actorService.UpdateAsync(actor);
        return Ok(new { imageUri = uri });
    }

    /// <summary>Clears the actor's uploaded portrait so its icon is shown instead.</summary>
    [HttpDelete("{id:guid}/image")]
    public async Task<IActionResult> ClearImage(Guid id)
    {
        var actor = await _actorService.GetByIdAsync(id);
        if (actor is null)
            return NotFound();

        _storage.Delete(actor.ImageUri);
        actor.ImageUri = string.Empty;
        await _actorService.UpdateAsync(actor);
        return NoContent();
    }

    [HttpPost("{actorId:guid}/resources")]
    public async Task<ActionResult<Resource>> AddResource(Guid actorId, [FromBody] Resource resource)
    {
        if (string.IsNullOrWhiteSpace(resource.Nome))
            return BadRequest("Nome is required.");

        try
        {
            var created = await _actorService.AddResourceAsync(actorId, resource);
            return CreatedAtAction(nameof(GetById), new { id = actorId }, created);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPut("{actorId:guid}/resources/{resourceId:guid}")]
    public async Task<IActionResult> UpdateResource(Guid actorId, Guid resourceId, [FromBody] Resource resource)
    {
        var updated = await _actorService.UpdateResourceAsync(actorId, resourceId, resource);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{actorId:guid}/resources/{resourceId:guid}")]
    public async Task<IActionResult> DeleteResource(Guid actorId, Guid resourceId)
    {
        var deleted = await _actorService.DeleteResourceAsync(actorId, resourceId);
        return deleted ? NoContent() : NotFound();
    }
}
