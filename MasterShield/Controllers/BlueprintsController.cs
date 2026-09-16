using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MasterShield.Controllers;

[ApiController]
[Route("api/blueprints")]
public class BlueprintsController : ControllerBase
{
    private readonly IBlueprintService _blueprintService;

    public BlueprintsController(IBlueprintService blueprintService)
    {
        _blueprintService = blueprintService;
    }

    [HttpGet("game-system/{gameSystemId:guid}")]
    public async Task<ActionResult<IEnumerable<SystemBlueprint>>> GetByGameSystem(Guid gameSystemId)
    {
        var blueprints = await _blueprintService.GetByGameSystemAsync(gameSystemId);
        return Ok(blueprints);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SystemBlueprint>>> GetAll() =>
        Ok(await _blueprintService.GetAllAsync());

    [HttpPost]
    public async Task<ActionResult<SystemBlueprint>> Create([FromBody] SystemBlueprint blueprint)
    {
        if (blueprint.GameSystemId == Guid.Empty || string.IsNullOrWhiteSpace(blueprint.Kind))
            return BadRequest("Kind and GameSystemId are required.");

        try
        {
            var created = await _blueprintService.CreateAsync(blueprint);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Creates the rule/note categories a system declares for a campaign.</summary>
    [HttpPost("ensure-categories")]
    public async Task<IActionResult> EnsureCategories(
        [FromQuery] Guid gameSystemId, [FromQuery] Guid campaignId)
    {
        if (gameSystemId == Guid.Empty || campaignId == Guid.Empty)
            return BadRequest("gameSystemId and campaignId are required.");

        await _blueprintService.EnsureCategoriesAsync(gameSystemId, campaignId);
        return NoContent();
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SystemBlueprint blueprint)
    {
        if (id != blueprint.Id)
            return BadRequest("Route id does not match payload id.");

        return await _blueprintService.UpdateAsync(blueprint) ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await _blueprintService.DeleteAsync(id) ? NoContent() : NotFound();

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SystemBlueprint>> GetById(Guid id)
    {
        var blueprint = await _blueprintService.GetByIdAsync(id);
        return blueprint is null ? NotFound() : Ok(blueprint);
    }

}
