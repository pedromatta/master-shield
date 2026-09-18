using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MasterShield.Controllers;

[ApiController]
[Route("api/encounters")]
public class EncountersController : ControllerBase
{
    private readonly IEncounterService _encounterService;

    public EncountersController(IEncounterService encounterService)
    {
        _encounterService = encounterService;
    }

    [HttpGet("session/{sessionId:guid}")]
    public async Task<ActionResult<IEnumerable<Encounter>>> GetBySession(Guid sessionId)
    {
        var encounters = await _encounterService.GetBySessionAsync(sessionId);
        return Ok(encounters);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Encounter>> GetById(Guid id)
    {
        var encounter = await _encounterService.GetByIdAsync(id);
        return encounter is null ? NotFound() : Ok(encounter);
    }

    [HttpPost]
    public async Task<ActionResult<Encounter>> Create([FromBody] Encounter encounter)
    {
        if (encounter.SessionId == Guid.Empty)
            return BadRequest("SessionId is required.");

        // The name is optional: the service derives "Encounter #N" when it is omitted.
        var created = await _encounterService.CreateAsync(encounter);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>Returns the session's current encounter, creating one if it has none.</summary>
    [HttpPost("session/{sessionId:guid}/ensure")]
    public async Task<ActionResult<Encounter>> Ensure(Guid sessionId)
    {
        var encounter = await _encounterService.EnsureEncounterAsync(sessionId);
        return Ok(encounter);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Encounter encounter)
    {
        if (id != encounter.Id)
            return BadRequest("Route id does not match payload id.");

        return await _encounterService.UpdateAsync(encounter) ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await _encounterService.DeleteAsync(id) ? NoContent() : NotFound();

    [HttpPost("{id:guid}/participants")]
    public async Task<ActionResult<EncounterParticipant>> AddParticipant(
        Guid id, [FromBody] AddParticipantRequest request)
    {
        if (request.ActorId == Guid.Empty)
            return BadRequest("ActorId is required.");

        try
        {
            var participant = await _encounterService.AddParticipantAsync(
                id, request.ActorId, request.Initiative, request.TemporaryHpOffset);

            return CreatedAtAction(nameof(GetById), new { id }, participant);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPut("{id:guid}/participants/{participantId:guid}/state")]
    public async Task<IActionResult> UpdateParticipantState(
        Guid id, Guid participantId, [FromBody] ParticipantStateRequest request)
    {
        var updated = await _encounterService.UpdateParticipantStateAsync(
            id, participantId, request.TemporaryHpOffset, request.TemporaryEffects);

        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}/participants/{participantId:guid}")]
    public async Task<IActionResult> RemoveParticipant(Guid id, Guid participantId)
    {
        var removed = await _encounterService.RemoveParticipantAsync(id, participantId);
        return removed ? NoContent() : NotFound();
    }

    /// <summary>
    /// Applies a resource change from the tracker. <paramref name="replace"/> selects absolute
    /// assignment ("set to N") instead of a relative delta ("+N"/"-N").
    /// </summary>
    [HttpPut("{id:guid}/participants/{participantId:guid}/resources/{resourceId:guid}")]
    public async Task<IActionResult> AdjustParticipantResource(
        Guid id, Guid participantId, Guid resourceId, [FromQuery] int value,
        [FromQuery] bool replace = false)
    {
        var updated = await _encounterService.AdjustParticipantResourceAsync(
            id, participantId, resourceId, value, replace);

        return updated ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/advance-round")]
    public async Task<IActionResult> AdvanceRound(Guid id)
    {
        var advanced = await _encounterService.AdvanceRoundAsync(id);
        return advanced ? NoContent() : NotFound();
    }

    /// <summary>Sets the round explicitly so the GM can step back between rounds.</summary>
    [HttpPut("{id:guid}/round")]
    public async Task<IActionResult> SetRound(Guid id, [FromQuery] int round)
    {
        var updated = await _encounterService.SetRoundAsync(id, round);
        return updated ? NoContent() : NotFound();
    }

    [HttpPut("{id:guid}/participants/order")]
    public async Task<IActionResult> ReorderParticipants(Guid id, [FromBody] IEnumerable<Guid> participantIds)
    {
        var reordered = await _encounterService.ReorderParticipantsAsync(id, participantIds);
        return reordered ? NoContent() : NotFound();
    }

    public record AddParticipantRequest(Guid ActorId, decimal Initiative, int TemporaryHpOffset);

    public record ParticipantStateRequest(int TemporaryHpOffset, Dictionary<string, object> TemporaryEffects);
}
