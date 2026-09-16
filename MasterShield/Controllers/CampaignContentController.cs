using MasterShield.Data;
using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Controllers;

/// <summary>
/// Exports and imports a campaign's authored content (actors, locations, rules, notes and the
/// tags/categories that group them) as a single portable document, so a GM can back up a
/// campaign or move it to another installation.
/// </summary>
[ApiController]
[Route("api/campaigns/{campaignId:guid}/content")]
public class CampaignContentController : ControllerBase
{
    private readonly MasterShieldContext _context;
    private readonly ISystemEntityService _systemEntities;

    public CampaignContentController(
        MasterShieldContext context, ISystemEntityService systemEntities)
    {
        _context = context;
        _systemEntities = systemEntities;
    }

    /// <summary>Serialises every authored entity in the campaign into one document.</summary>
    [HttpGet("export")]
    public async Task<ActionResult<CampaignContentExport>> Export(Guid campaignId)
    {
        var campaign = await _context.Campaigns
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == campaignId);

        if (campaign is null)
            return NotFound();

        var actors = await _context.Actors
            .Include(a => a.Resources)
            .Where(a => a.CampaignId == campaignId)
            .AsNoTracking()
            .ToListAsync();

        var locations = await _context.Locations
            .Where(l => l.CampaignId == campaignId)
            .AsNoTracking()
            .ToListAsync();

        var rules = await _context.Rules
            .Include(r => r.Category)
            .Where(r => r.Category != null && r.Category.CampaignId == campaignId)
            .AsNoTracking()
            .ToListAsync();

        var notes = await _context.Notes
            .Include(n => n.NoteCategory)
            .Where(n => n.CampaignId == campaignId)
            .AsNoTracking()
            .ToListAsync();

        var counters = await _context.Counters
            .Where(c => c.CampaignId == campaignId)
            .AsNoTracking()
            .ToListAsync();

        return Ok(new CampaignContentExport(
            campaign.Name,
            campaign.GameSystemId,
            actors.Select(a => new ExportedActor(
                a.Name, a.Type.ToString(), a.Notes, a.ImageUri, a.SystemData,
                a.Resources.Select(r => new ExportedResource(
                    r.Nome, r.CurrentValue, r.MaxValue, r.ColorHwx)).ToList())).ToList(),
            locations.Select(l => new ExportedLocation(
                l.Name, l.Description, l.ImageUri)).ToList(),
            rules.Select(r => new ExportedRule(
                r.Category!.Name, r.Title, r.Content, r.SystemData)).ToList(),
            notes.Select(n => new ExportedNote(
                n.NoteCategory?.Name ?? string.Empty, n.Title, n.Content)).ToList(),
            counters.Select(c => new ExportedCounter(
                c.Name, c.Boxes, c.CurrentValue, c.ColorHex)).ToList()));
    }

    /// <summary>
    /// Imports a previously exported document into a campaign, creating real entities. Rule and
    /// note categories are created on demand.
    /// </summary>
    [HttpPost("import")]
    public async Task<ActionResult> Import(
        Guid campaignId, [FromBody] CampaignContentExport document,
        [FromQuery] bool replaceCategories = false)
    {
        if (document is null)
            return BadRequest("A document is required.");

        if (!await _context.Campaigns.AnyAsync(c => c.Id == campaignId))
            return NotFound();

        var ruleCategories = new Dictionary<string, RuleCategory>(StringComparer.OrdinalIgnoreCase);
        var noteCategories = new Dictionary<string, NoteCategory>(StringComparer.OrdinalIgnoreCase);

        async Task<RuleCategory> ResolveRuleCategoryAsync(string name)
        {
            var key = string.IsNullOrWhiteSpace(name) ? "General" : name.Trim();
            if (ruleCategories.TryGetValue(key, out var cached)) return cached;

            var existing = await _context.RuleCategories
                .FirstOrDefaultAsync(rc => rc.CampaignId == campaignId && rc.Name == key);
            if (existing is null)
            {
                existing = new RuleCategory
                {
                    Id = Guid.NewGuid(),
                    CampaignId = campaignId,
                    Name = key,
                    ShowInToolbar = true
                };
                _context.RuleCategories.Add(existing);
            }
            ruleCategories[key] = existing;
            return existing;
        }

        async Task<NoteCategory?> ResolveNoteCategoryAsync(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return null;
            var key = name.Trim();
            if (noteCategories.TryGetValue(key, out var cached)) return cached;

            var existing = await _context.NoteCategories
                .FirstOrDefaultAsync(nc => nc.CampaignId == campaignId && nc.Name == key);
            if (existing is null)
            {
                existing = new NoteCategory
                {
                    Id = Guid.NewGuid(),
                    CampaignId = campaignId,
                    Name = key
                };
                _context.NoteCategories.Add(existing);
            }
            noteCategories[key] = existing;
            return existing;
        }

        foreach (var actor in document.Actors ?? [])
        {
            _context.Actors.Add(new Actor
            {
                Id = Guid.NewGuid(),
                CampaignId = campaignId,
                Name = actor.Name,
                Type = Enum.TryParse<ActorType>(actor.Type, ignoreCase: true, out var type)
                    ? type
                    : ActorType.NonPlayerCharacter,
                Notes = actor.Notes,
                ImageUri = actor.ImageUri,
                SystemData = actor.SystemData ?? new Dictionary<string, object>(),
                Resources = (actor.Resources ?? [])
                    .Select(r => new Resource
                    {
                        Id = Guid.NewGuid(),
                        Nome = r.Nome,
                        CurrentValue = r.CurrentValue,
                        MaxValue = r.MaxValue,
                        ColorHwx = r.ColorHwx
                    })
                    .ToList()
            });
        }

        foreach (var location in document.Locations ?? [])
        {
            _context.Locations.Add(new Location
            {
                Id = Guid.NewGuid(),
                CampaignId = campaignId,
                Name = location.Name,
                Description = location.Description,
                ImageUri = location.ImageUri
            });
        }

        foreach (var rule in document.Rules ?? [])
        {
            var category = await ResolveRuleCategoryAsync(rule.Category);
            _context.Rules.Add(new Rule
            {
                Id = Guid.NewGuid(),
                RuleCategoryId = category.Id,
                Title = rule.Title,
                Content = rule.Content,
                SystemData = rule.SystemData ?? new Dictionary<string, object>()
            });
        }

        foreach (var note in document.Notes ?? [])
        {
            var category = await ResolveNoteCategoryAsync(note.Category);
            _context.Notes.Add(new Note
            {
                Id = Guid.NewGuid(),
                CampaignId = campaignId,
                NoteCategoryId = category?.Id,
                Title = note.Title,
                Content = note.Content
            });
        }

        foreach (var counter in document.Counters ?? [])
        {
            _context.Counters.Add(new Counter
            {
                Id = Guid.NewGuid(),
                CampaignId = campaignId,
                Name = counter.Name,
                Boxes = counter.Boxes,
                CurrentValue = counter.CurrentValue,
                ColorHex = counter.ColorHex
            });
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Captures the campaign's content into a game system as reusable templates.</summary>
    [HttpPost("capture-to-system/{gameSystemId:guid}")]
    public async Task<ActionResult<IEnumerable<SystemEntityTemplate>>> CaptureToSystem(
        Guid campaignId, Guid gameSystemId)
    {
        try
        {
            var captured = await _systemEntities.CaptureFromCampaignAsync(gameSystemId, campaignId);
            return StatusCode(StatusCodes.Status201Created, captured);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    public record CampaignContentExport(
        string Name,
        Guid? GameSystemId,
        List<ExportedActor>? Actors,
        List<ExportedLocation>? Locations,
        List<ExportedRule>? Rules,
        List<ExportedNote>? Notes,
        List<ExportedCounter>? Counters);

    public record ExportedActor(
        string Name, string Type, string Notes, string ImageUri,
        Dictionary<string, object>? SystemData, List<ExportedResource>? Resources);

    public record ExportedResource(string Nome, int CurrentValue, int MaxValue, string ColorHwx);

    public record ExportedLocation(string Name, string Description, string ImageUri);

    public record ExportedRule(
        string Category, string Title, string Content, Dictionary<string, object>? SystemData);

    public record ExportedNote(string Category, string Title, string Content);

    public record ExportedCounter(string Name, int Boxes, int CurrentValue, string ColorHex);
}
