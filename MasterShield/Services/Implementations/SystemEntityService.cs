using MasterShield.Data;
using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Services.Implementations;

/// <summary>
/// Authors game-system content templates and copies them into campaigns (and back) as real
/// entities. Templates are campaign-agnostic, so the same bestiary entry can seed any number
/// of campaigns without sharing row identity.
/// </summary>
public class SystemEntityService : MasterShieldContextService, ISystemEntityService
{
    private readonly IBlueprintService _blueprints;

    public SystemEntityService(MasterShieldContext context, IBlueprintService blueprints)
        : base(context)
    {
        _blueprints = blueprints;
    }

    public async Task<IEnumerable<SystemEntityTemplate>> GetByGameSystemAsync(
        Guid gameSystemId, string? kind = null)
    {
        var query = Context.SystemEntityTemplates
            .Where(t => t.GameSystemId == gameSystemId);

        if (!string.IsNullOrWhiteSpace(kind))
            query = query.Where(t => t.Kind == kind);

        return await query
            .OrderBy(t => t.Kind)
            .ThenBy(t => t.SortOrder)
            .ThenBy(t => t.Name)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<SystemEntityTemplate?> GetByIdAsync(Guid id) =>
        await Context.SystemEntityTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);

    public async Task<SystemEntityTemplate> CreateAsync(SystemEntityTemplate template)
    {
        if (template.Id == Guid.Empty)
            template.Id = Guid.NewGuid();

        Validate(template);
        Context.SystemEntityTemplates.Add(template);
        await Context.SaveChangesAsync();
        return template;
    }

    public async Task<IEnumerable<SystemEntityTemplate>> CreateManyAsync(
        Guid gameSystemId, IEnumerable<SystemEntityTemplate> templates)
    {
        if (!await Context.GameSystems.AnyAsync(g => g.Id == gameSystemId))
            throw new KeyNotFoundException($"Game system '{gameSystemId}' was not found.");

        var created = new List<SystemEntityTemplate>();
        foreach (var template in templates ?? [])
        {
            Validate(template);
            template.Id = template.Id == Guid.Empty ? Guid.NewGuid() : template.Id;
            template.GameSystemId = gameSystemId;
            created.Add(template);
        }

        Context.SystemEntityTemplates.AddRange(created);
        await Context.SaveChangesAsync();
        return created;
    }

    public async Task<bool> UpdateAsync(SystemEntityTemplate template)
    {
        var existing = await Context.SystemEntityTemplates.FirstOrDefaultAsync(t => t.Id == template.Id);
        if (existing is null)
            return false;

        Validate(template);
        existing.Kind = template.Kind;
        existing.Name = template.Name;
        existing.Description = template.Description;
        existing.ImageUri = template.ImageUri;
        existing.Category = template.Category;
        existing.SortOrder = template.SortOrder;
        existing.Resources = template.Resources ?? [];
        existing.SystemData = template.SystemData ?? new Dictionary<string, object>();

        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var template = await Context.SystemEntityTemplates.FirstOrDefaultAsync(t => t.Id == id);
        if (template is null)
            return false;

        Context.SystemEntityTemplates.Remove(template);
        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<SystemSeedResult> ApplyToCampaignAsync(
        Guid gameSystemId, Guid campaignId, IEnumerable<Guid>? templateIds = null)
    {
        if (!await Context.Campaigns.AnyAsync(c => c.Id == campaignId))
            throw new KeyNotFoundException($"Campaign '{campaignId}' was not found.");

        // The system's blueprints declare the rule/note categories a campaign should offer.
        await _blueprints.EnsureCategoriesAsync(gameSystemId, campaignId);

        var query = Context.SystemEntityTemplates
            .Where(t => t.GameSystemId == gameSystemId);

        var ids = templateIds?.Distinct().ToList() ?? [];
        if (ids.Count > 0)
            query = query.Where(t => ids.Contains(t.Id));

        var templates = await query
            .OrderBy(t => t.Kind).ThenBy(t => t.SortOrder).ThenBy(t => t.Name)
            .AsNoTracking()
            .ToListAsync();

        if (templates.Count == 0)
            return new SystemSeedResult(0, 0, 0, 0);

        // Rule and note categories are shared per campaign, so map names to a single row.
        var ruleCategories = new Dictionary<string, RuleCategory>(StringComparer.OrdinalIgnoreCase);
        var noteCategories = new Dictionary<string, NoteCategory>(StringComparer.OrdinalIgnoreCase);

        var actors = 0;
        var locations = 0;
        var rules = 0;
        var notes = 0;

        foreach (var template in templates)
        {
            switch (template.Kind)
            {
                case TemplateKinds.Actor:
                    Context.Actors.Add(BuildActor(template, campaignId));
                    actors++;
                    break;

                case TemplateKinds.Location:
                    Context.Locations.Add(new Location
                    {
                        Id = Guid.NewGuid(),
                        CampaignId = campaignId,
                        Name = template.Name,
                        Description = template.Description,
                        ImageUri = template.ImageUri
                    });
                    locations++;
                    break;

                case TemplateKinds.Rule:
                {
                    var category = await ResolveRuleCategoryAsync(campaignId, template.Category, ruleCategories);
                    Context.Rules.Add(new Rule
                    {
                        Id = Guid.NewGuid(),
                        RuleCategoryId = category.Id,
                        Title = template.Name,
                        Content = template.Description,
                        SystemData = Clone(template.SystemData)
                    });
                    rules++;
                    break;
                }

                case TemplateKinds.Note:
                {
                    var category = await ResolveNoteCategoryAsync(campaignId, template.Category, noteCategories);
                    Context.Notes.Add(new Note
                    {
                        Id = Guid.NewGuid(),
                        CampaignId = campaignId,
                        NoteCategoryId = category?.Id,
                        Title = template.Name,
                        Content = template.Description
                    });
                    notes++;
                    break;
                }
            }
        }

        await Context.SaveChangesAsync();
        return new SystemSeedResult(actors, locations, rules, notes);
    }

    public async Task<IEnumerable<SystemEntityTemplate>> CaptureFromCampaignAsync(
        Guid gameSystemId, Guid campaignId, IEnumerable<Guid>? entityIds = null)
    {
        if (!await Context.GameSystems.AnyAsync(g => g.Id == gameSystemId))
            throw new KeyNotFoundException($"Game system '{gameSystemId}' was not found.");

        var ids = entityIds?.Distinct().ToHashSet() ?? [];
        var captured = new List<SystemEntityTemplate>();
        var order = 0;

        // Actors (with their resource bars) become Actor templates.
        var actors = await Context.Actors
            .Include(a => a.Resources)
            .Where(a => a.CampaignId == campaignId && (ids.Count == 0 || ids.Contains(a.Id)))
            .AsNoTracking()
            .ToListAsync();

        foreach (var actor in actors)
        {
            captured.Add(new SystemEntityTemplate
            {
                Id = Guid.NewGuid(),
                GameSystemId = gameSystemId,
                Kind = TemplateKinds.Actor,
                Name = actor.Name,
                Description = actor.Notes,
                ImageUri = actor.ImageUri,
                Category = actor.Type.ToString(),
                SortOrder = order++,
                Resources = actor.Resources
                    .Select(r => new TemplateResource
                    {
                        Nome = r.Nome,
                        CurrentValue = r.CurrentValue,
                        MaxValue = r.MaxValue,
                        ColorHwx = r.ColorHwx
                    })
                    .ToList(),
                SystemData = Clone(actor.SystemData)
            });
        }

        var locations = await Context.Locations
            .Where(l => l.CampaignId == campaignId && (ids.Count == 0 || ids.Contains(l.Id)))
            .AsNoTracking()
            .ToListAsync();

        foreach (var location in locations)
        {
            captured.Add(new SystemEntityTemplate
            {
                Id = Guid.NewGuid(),
                GameSystemId = gameSystemId,
                Kind = TemplateKinds.Location,
                Name = location.Name,
                Description = location.Description,
                ImageUri = location.ImageUri,
                SortOrder = order++
            });
        }

        var rules = await Context.Rules
            .Include(r => r.Category)
            .Where(r => r.Category != null && r.Category.CampaignId == campaignId)
            .Where(r => ids.Count == 0 || ids.Contains(r.Id))
            .AsNoTracking()
            .ToListAsync();

        foreach (var rule in rules)
        {
            captured.Add(new SystemEntityTemplate
            {
                Id = Guid.NewGuid(),
                GameSystemId = gameSystemId,
                Kind = TemplateKinds.Rule,
                Name = rule.Title,
                Description = rule.Content,
                Category = rule.Category?.Name ?? string.Empty,
                SortOrder = order++,
                SystemData = Clone(rule.SystemData)
            });
        }

        var notes = await Context.Notes
            .Include(n => n.NoteCategory)
            .Where(n => n.CampaignId == campaignId && (ids.Count == 0 || ids.Contains(n.Id)))
            .AsNoTracking()
            .ToListAsync();

        foreach (var note in notes)
        {
            captured.Add(new SystemEntityTemplate
            {
                Id = Guid.NewGuid(),
                GameSystemId = gameSystemId,
                Kind = TemplateKinds.Note,
                Name = note.Title,
                Description = note.Content,
                Category = note.NoteCategory?.Name ?? string.Empty,
                SortOrder = order++
            });
        }

        Context.SystemEntityTemplates.AddRange(captured);
        await Context.SaveChangesAsync();
        return captured;
    }

    private static Actor BuildActor(SystemEntityTemplate template, Guid campaignId) => new()
    {
        Id = Guid.NewGuid(),
        CampaignId = campaignId,
        Name = template.Name,
        Notes = template.Description,
        ImageUri = template.ImageUri,
        // Templates declare their actor type through Category; anything unknown is an NPC.
        Type = Enum.TryParse<ActorType>(template.Category, ignoreCase: true, out var type)
            ? type
            : ActorType.NonPlayerCharacter,
        SystemData = Clone(template.SystemData),
        Resources = template.Resources
            .Select(r => new Resource
            {
                Id = Guid.NewGuid(),
                Nome = r.Nome,
                CurrentValue = r.CurrentValue,
                MaxValue = r.MaxValue,
                ColorHwx = r.ColorHwx
            })
            .ToList()
    };

    private async Task<RuleCategory> ResolveRuleCategoryAsync(
        Guid campaignId, string name, Dictionary<string, RuleCategory> cache)
    {
        var key = string.IsNullOrWhiteSpace(name) ? "General" : name.Trim();
        if (cache.TryGetValue(key, out var cached))
            return cached;

        var existing = await Context.RuleCategories
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
            Context.RuleCategories.Add(existing);
        }

        cache[key] = existing;
        return existing;
    }

    private async Task<NoteCategory?> ResolveNoteCategoryAsync(
        Guid campaignId, string name, Dictionary<string, NoteCategory> cache)
    {
        if (string.IsNullOrWhiteSpace(name))
            return null;

        var key = name.Trim();
        if (cache.TryGetValue(key, out var cached))
            return cached;

        var existing = await Context.NoteCategories
            .FirstOrDefaultAsync(nc => nc.CampaignId == campaignId && nc.Name == key);

        if (existing is null)
        {
            existing = new NoteCategory
            {
                Id = Guid.NewGuid(),
                CampaignId = campaignId,
                Name = key
            };
            Context.NoteCategories.Add(existing);
        }

        cache[key] = existing;
        return existing;
    }

    private static void Validate(SystemEntityTemplate template)
    {
        if (string.IsNullOrWhiteSpace(template.Name))
            throw new ArgumentException("A template needs a name.", nameof(template));

        if (!TemplateKinds.All.Contains(template.Kind))
        {
            throw new ArgumentException(
                $"Template kind must be one of: {string.Join(", ", TemplateKinds.All)}.", nameof(template));
        }
    }

    /// <summary>Deep-copies the arbitrary payload so templates and instances never share state.</summary>
    private static Dictionary<string, object> Clone(Dictionary<string, object>? source)
    {
        if (source is null || source.Count == 0)
            return new Dictionary<string, object>();

        var json = System.Text.Json.JsonSerializer.Serialize(source);
        return System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json)
            ?? new Dictionary<string, object>();
    }
}
