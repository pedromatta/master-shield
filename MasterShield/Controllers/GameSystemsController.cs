using MasterShield.Data;
using MasterShield.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Controllers;

[ApiController]
[Route("api/game-systems")]
public class GameSystemsController : ControllerBase
{
    private readonly MasterShieldContext _context;

    public GameSystemsController(MasterShieldContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GameSystem>>> GetAll() =>
        Ok(await _context.GameSystems
            .AsNoTracking()
            .Include(g => g.Blueprints)
            .OrderBy(g => g.Name)
            .ToListAsync());

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GameSystem>> GetById(Guid id)
    {
        var system = await _context.GameSystems
            .AsNoTracking()
            .Include(g => g.Blueprints)
            .FirstOrDefaultAsync(g => g.Id == id);

        return system is null ? NotFound() : Ok(system);
    }

    [HttpPost]
    public async Task<ActionResult<GameSystem>> Create([FromBody] GameSystem system)
    {
        if (string.IsNullOrWhiteSpace(system.Name))
            return BadRequest("Name is required.");

        if (system.Id == Guid.Empty)
            system.Id = Guid.NewGuid();

        _context.GameSystems.Add(system);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = system.Id }, system);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] GameSystem system)
    {
        if (id != system.Id)
            return BadRequest("Route id does not match payload id.");

        if (string.IsNullOrWhiteSpace(system.Name))
            return BadRequest("Name is required.");

        var existing = await _context.GameSystems.FirstOrDefaultAsync(g => g.Id == id);
        if (existing is null)
            return NotFound();

        existing.Name = system.Name;
        existing.Version = system.Version;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var system = await _context.GameSystems.FirstOrDefaultAsync(g => g.Id == id);
        if (system is null)
            return NotFound();

        if (await _context.Campaigns.AnyAsync(c => c.GameSystemId == id))
            return Conflict("The game system is in use by one or more campaigns.");

        _context.GameSystems.Remove(system);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Serializes the system and all of its blueprints into a portable document. The id is
    /// deliberately excluded so an exported file can be imported into any installation.
    /// </summary>
    [HttpGet("{id:guid}/export")]
    public async Task<ActionResult<GameSystemExport>> Export(Guid id)
    {
        var system = await _context.GameSystems
            .AsNoTracking()
            .Include(g => g.Blueprints)
            .Include(g => g.Templates)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (system is null)
            return NotFound();

        return Ok(new GameSystemExport(
            system.Name,
            system.Version,
            system.Blueprints
                .OrderBy(b => b.Kind)
                .ThenBy(b => b.ActorType)
                .Select(b => new BlueprintExport(
                    b.Kind, b.ActorType, b.Name, b.Resources, b.Attributes,
                    b.RuleCategories, b.NoteCategories))
                .ToList(),
            system.Templates
                .OrderBy(t => t.Kind)
                .ThenBy(t => t.SortOrder)
                .Select(t => new TemplateExport(
                    t.Kind, t.Name, t.Description, t.ImageUri, t.Category,
                    t.SortOrder, t.Resources, t.SystemData))
                .ToList()));
    }

    /// <summary>Creates a new game system (blueprints + premade entities) from a document.</summary>
    [HttpPost("import")]
    public async Task<ActionResult<GameSystem>> Import([FromBody] GameSystemExport document)
    {
        if (document is null || string.IsNullOrWhiteSpace(document.Name))
            return BadRequest("A document with a Name is required.");

        var system = new GameSystem
        {
            Id = Guid.NewGuid(),
            Name = document.Name.Trim(),
            Version = document.Version?.Trim() ?? string.Empty
        };

        foreach (var blueprint in document.Blueprints ?? [])
        {
            system.Blueprints.Add(new SystemBlueprint
            {
                Id = Guid.NewGuid(),
                GameSystemId = system.Id,
                Kind = blueprint.Kind,
                ActorType = blueprint.ActorType ?? string.Empty,
                Name = blueprint.Name,
                Resources = blueprint.Resources ?? [],
                Attributes = blueprint.Attributes ?? [],
                RuleCategories = blueprint.RuleCategories ?? [],
                NoteCategories = blueprint.NoteCategories ?? []
            });
        }

        foreach (var template in document.Templates ?? [])
        {
            system.Templates.Add(new SystemEntityTemplate
            {
                Id = Guid.NewGuid(),
                GameSystemId = system.Id,
                Kind = template.Kind,
                Name = template.Name,
                Description = template.Description ?? string.Empty,
                ImageUri = template.ImageUri ?? string.Empty,
                Category = template.Category ?? string.Empty,
                SortOrder = template.SortOrder,
                Resources = template.Resources ?? [],
                SystemData = template.SystemData ?? new Dictionary<string, object>()
            });
        }

        _context.GameSystems.Add(system);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = system.Id }, system);
    }

    public record GameSystemExport(
        string Name,
        string? Version,
        ICollection<BlueprintExport>? Blueprints,
        ICollection<TemplateExport>? Templates);

    public record BlueprintExport(
        string Kind,
        string? ActorType,
        string Name,
        List<BlueprintResource>? Resources,
        List<BlueprintAttribute>? Attributes,
        List<string>? RuleCategories,
        List<string>? NoteCategories);

    public record TemplateExport(
        string Kind,
        string Name,
        string? Description,
        string? ImageUri,
        string? Category,
        int SortOrder,
        List<TemplateResource>? Resources,
        Dictionary<string, object>? SystemData);
}
