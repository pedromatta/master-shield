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
        if (string.IsNullOrWhiteSpace(session.Title) || session.CampaignId == Guid.Empty)
            return BadRequest("Title and CampaignId are required.");

        var created = await _sessionService.CreateAsync(session);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
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
