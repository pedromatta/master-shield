using Daedala.Models;
using Daedala.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Daedala.Controllers;

[ApiController]
[Route("api/counters")]
public class CountersController : ControllerBase
{
    private readonly ICounterService _counterService;

    public CountersController(ICounterService counterService)
    {
        _counterService = counterService;
    }

    [HttpGet("campaign/{campaignId:guid}")]
    public async Task<ActionResult<IEnumerable<Counter>>> GetByCampaign(Guid campaignId) =>
        Ok(await _counterService.GetByCampaignAsync(campaignId));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Counter>> GetById(Guid id)
    {
        var counter = await _counterService.GetByIdAsync(id);
        return counter is null ? NotFound() : Ok(counter);
    }

    [HttpPost]
    public async Task<ActionResult<Counter>> Create([FromBody] Counter counter)
    {
        if (string.IsNullOrWhiteSpace(counter.Name) || counter.CampaignId == Guid.Empty)
            return BadRequest("Name and CampaignId are required.");

        if (counter.Boxes < 1)
            return BadRequest("A counter needs at least one box.");

        var created = await _counterService.CreateAsync(counter);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Counter counter)
    {
        if (id != counter.Id)
            return BadRequest("Route id does not match payload id.");

        return await _counterService.UpdateAsync(counter) ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await _counterService.DeleteAsync(id) ? NoContent() : NotFound();
}
