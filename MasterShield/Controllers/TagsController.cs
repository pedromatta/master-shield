using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MasterShield.Controllers;

[ApiController]
[Route("api/tags")]
public class TagsController : ControllerBase
{
    private readonly ITagService _tagService;

    public TagsController(ITagService tagService)
    {
        _tagService = tagService;
    }

    [HttpGet("campaign/{campaignId:guid}")]
    public async Task<ActionResult<IEnumerable<Tag>>> GetByCampaign(
        Guid campaignId, [FromQuery] TagCategory? category) =>
        Ok(await _tagService.GetByCampaignAsync(campaignId, category));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Tag>> GetById(Guid id)
    {
        var tag = await _tagService.GetByIdAsync(id);
        return tag is null ? NotFound() : Ok(tag);
    }

    [HttpPost]
    public async Task<ActionResult<Tag>> Create([FromBody] Tag tag)
    {
        if (string.IsNullOrWhiteSpace(tag.Name) || tag.CampaignId == Guid.Empty)
            return BadRequest("Name and CampaignId are required.");

        var created = await _tagService.CreateAsync(tag);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Tag tag)
    {
        if (id != tag.Id)
            return BadRequest("Route id does not match payload id.");

        return await _tagService.UpdateAsync(tag) ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await _tagService.DeleteAsync(id) ? NoContent() : NotFound();
}
