using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MasterShield.Controllers;

[ApiController]
[Route("api/notes")]
public class NotesController : ControllerBase
{
    private readonly INoteService _noteService;
    private readonly IFileStorageService _storage;

    public NotesController(INoteService noteService, IFileStorageService storage)
    {
        _noteService = noteService;
        _storage = storage;
    }

    [HttpGet("campaign/{campaignId:guid}")]
    public async Task<ActionResult<IEnumerable<Note>>> GetByCampaign(Guid campaignId) =>
        Ok(await _noteService.GetByCampaignAsync(campaignId));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Note>> GetById(Guid id)
    {
        var note = await _noteService.GetByIdAsync(id);
        return note is null ? NotFound() : Ok(note);
    }

    [HttpPost]
    public async Task<ActionResult<Note>> Create([FromBody] Note note)
    {
        if (note.CampaignId is null || note.CampaignId == Guid.Empty)
            return BadRequest("CampaignId is required.");

        var created = await _noteService.CreateAsync(note);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Note note)
    {
        if (id != note.Id)
            return BadRequest("Route id does not match payload id.");

        return await _noteService.UpdateAsync(note) ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await _noteService.DeleteAsync(id) ? NoContent() : NotFound();

    [HttpPut("{id:guid}/tags")]
    public async Task<IActionResult> SetTags(Guid id, [FromBody] IEnumerable<Guid> tagIds) =>
        await _noteService.SetTagsAsync(id, tagIds) ? NoContent() : NotFound();

    [HttpGet("categories/campaign/{campaignId:guid}")]
    public async Task<ActionResult<IEnumerable<NoteCategory>>> GetCategories(Guid campaignId) =>
        Ok(await _noteService.GetCategoriesAsync(campaignId));

    [HttpPost("categories")]
    public async Task<ActionResult<NoteCategory>> CreateCategory([FromBody] NoteCategory category)
    {
        if (string.IsNullOrWhiteSpace(category.Name))
            return BadRequest("Name is required.");

        var created = await _noteService.CreateCategoryAsync(category);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPut("categories/{id:guid}")]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] NoteCategory category)
    {
        if (id != category.Id)
            return BadRequest("Route id does not match payload id.");

        return await _noteService.UpdateCategoryAsync(category) ? NoContent() : NotFound();
    }

    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id) =>
        await _noteService.DeleteCategoryAsync(id) ? NoContent() : NotFound();

    /// <summary>Uploads the category's icon image and stores its URI.</summary>
    [HttpPost("categories/{id:guid}/icon")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<string>> UploadCategoryIcon(
        Guid id, [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null)
            return BadRequest("A file is required.");

        var category = await _noteService.GetCategoryByIdAsync(id);
        if (category is null)
            return NotFound();

        string uri;
        try
        {
            uri = await _storage.SaveAsync(file, "note-categories", cancellationToken);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }

        _storage.Delete(category.IconUri);
        category.IconUri = uri;
        await _noteService.UpdateCategoryAsync(category);
        return Ok(new { iconUri = uri });
    }
}
