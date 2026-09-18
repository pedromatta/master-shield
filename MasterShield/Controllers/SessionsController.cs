using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MasterShield.Controllers;

[ApiController]
[Route("api/sessions")]
public class SessionsController : ControllerBase
{
    private readonly ISessionService _sessionService;

    public SessionsController(ISessionService sessionService)
    {
        _sessionService = sessionService;
    }

    [HttpGet("campaign/{campaignId:guid}")]
    public async Task<ActionResult<IEnumerable<Session>>> GetByCampaign(Guid campaignId)
    {
        var sessions = await _sessionService.GetByCampaignAsync(campaignId);
        return Ok(sessions);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Session>> GetById(Guid id)
    {
        var session = await _sessionService.GetByIdAsync(id);
        return session is null ? NotFound() : Ok(session);
    }

    [HttpPost]
    public async Task<ActionResult<Session>> Create([FromBody] Session session)
    {
        if (session.CampaignId == Guid.Empty)
            return BadRequest("CampaignId is required.");

        // The title is optional: the service derives "Session #N" when it is omitted.
        var created = await _sessionService.CreateAsync(session);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>Returns the campaign's current session, creating one if it has none.</summary>
    [HttpPost("campaign/{campaignId:guid}/ensure")]
    public async Task<ActionResult<Session>> Ensure(Guid campaignId)
    {
        var session = await _sessionService.EnsureSessionAsync(campaignId);
        return Ok(session);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Session session)
    {
        if (id != session.Id)
            return BadRequest("Route id does not match payload id.");

        return await _sessionService.UpdateAsync(session) ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await _sessionService.DeleteAsync(id) ? NoContent() : NotFound();
}
