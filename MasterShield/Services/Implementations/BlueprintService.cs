using MasterShield.Data;
using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Services.Implementations;

/// <summary>
/// Authors the blueprints that dictate how new entities are created in a game system, and
/// applies those defaults when campaigns create their own content.
/// </summary>
public class BlueprintService : IBlueprintService
{
    private readonly MasterShieldContext _context;

    public BlueprintService(MasterShieldContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<SystemBlueprint>> GetByGameSystemAsync(Guid gameSystemId) =>
        await _context.SystemBlueprints
            .Where(b => b.GameSystemId == gameSystemId)
            .OrderBy(b => b.Kind)
            .ThenBy(b => b.ActorType)
            .AsNoTracking()
            .ToListAsync();

    public async Task<IEnumerable<SystemBlueprint>> GetAllAsync() =>
        await _context.SystemBlueprints
            .OrderBy(b => b.Kind)
            .AsNoTracking()
            .ToListAsync();

    public async Task<SystemBlueprint?> GetByIdAsync(Guid id) =>
        await _context.SystemBlueprints
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id);

    public async Task<SystemBlueprint> CreateAsync(SystemBlueprint blueprint)
    {
        Validate(blueprint);

        if (blueprint.Id == Guid.Empty)
            blueprint.Id = Guid.NewGuid();

        // A system keeps a single blueprint per (kind, actor type) so defaults are unambiguous.
        var duplicate = await _context.SystemBlueprints.AnyAsync(b =>
            b.GameSystemId == blueprint.GameSystemId
            && b.Kind == blueprint.Kind
            && b.ActorType == blueprint.ActorType);

        if (duplicate)
        {
            throw new InvalidOperationException(
                $"A {blueprint.Kind} blueprint already exists for this system.");
        }

        _context.SystemBlueprints.Add(blueprint);
        await _context.SaveChangesAsync();
        return blueprint;
    }

    public async Task<bool> UpdateAsync(SystemBlueprint blueprint)
    {
        var existing = await _context.SystemBlueprints.FirstOrDefaultAsync(b => b.Id == blueprint.Id);
        if (existing is null)
            return false;

        Validate(blueprint);
        existing.Kind = blueprint.Kind;
        existing.ActorType = blueprint.ActorType;
        existing.Name = blueprint.Name;
        existing.Resources = blueprint.Resources ?? [];
        existing.Attributes = blueprint.Attributes ?? [];
        existing.RuleCategories = blueprint.RuleCategories ?? [];
        existing.NoteCategories = blueprint.NoteCategories ?? [];

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var blueprint = await _context.SystemBlueprints.FirstOrDefaultAsync(b => b.Id == id);
        if (blueprint is null)
            return false;

        _context.SystemBlueprints.Remove(blueprint);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Resolves the blueprint governing a new entity: the most specific match wins (an
    /// actor-type blueprint beats a kind-wide one).
    /// </summary>
    public async Task<SystemBlueprint?> ResolveForAsync(
        Guid campaignId, string kind, string? actorType = null)
    {
        var gameSystemId = await _context.Campaigns
            .Where(c => c.Id == campaignId)
            .Select(c => c.GameSystemId)
            .FirstOrDefaultAsync();

        if (gameSystemId is null)
            return null;

        var candidates = await _context.SystemBlueprints
            .Where(b => b.GameSystemId == gameSystemId && b.Kind == kind)
            .AsNoTracking()
            .ToListAsync();

        if (candidates.Count == 0)
            return null;

        if (!string.IsNullOrWhiteSpace(actorType))
        {
            var typed = candidates.FirstOrDefault(b =>
                string.Equals(b.ActorType, actorType, StringComparison.OrdinalIgnoreCase));
            if (typed is not null)
                return typed;
        }

        // Fall back to a kind-wide blueprint that does not specialise an actor type.
        return candidates.FirstOrDefault(b => string.IsNullOrWhiteSpace(b.ActorType));
    }

    /// <summary>
    /// Applies the actor blueprint to a freshly created actor: seeds default resources it does
    /// not already have and fills in any missing system attributes. Explicit client values win.
    /// </summary>
    public async Task ApplyActorDefaultsAsync(Actor actor)
    {
        var blueprint = await ResolveForAsync(actor.CampaignId, BlueprintKinds.Actor, actor.Type.ToString());
        if (blueprint is null)
            return;

        ApplyAttributesTo(actor.SystemData, blueprint);

        // The blueprint decides which attributes the actor's Overview shows by default.
        if (actor.OverviewFields.Count == 0)
        {
            actor.OverviewFields = blueprint.Attributes
                .Where(a => a.ShowInOverview && !string.IsNullOrWhiteSpace(a.Key))
                .Select(a => a.Key)
                .ToList();
        }

        var existing = actor.Resources
            .Select(r => r.Nome)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var resource in blueprint.Resources)
        {
            if (string.IsNullOrWhiteSpace(resource.Nome) || !existing.Add(resource.Nome))
                continue;

            actor.Resources.Add(new Resource
            {
                Id = Guid.NewGuid(),
                ActorId = actor.Id,
                Nome = resource.Nome,
                CurrentValue = Math.Clamp(resource.CurrentValue, 0, resource.MaxValue),
                MaxValue = resource.MaxValue,
                ColorHwx = resource.ColorHwx
            });
        }

        // Default the encounter-resource view to the blueprint's overview selection.
        if (actor.EncounterResourceIds.Count == 0)
        {
            var overview = actor.Resources
                .Where(r => blueprint.Resources.Any(b =>
                    string.Equals(b.Nome, r.Nome, StringComparison.OrdinalIgnoreCase) && b.ShowInOverview))
                .Select(r => r.Id)
                .ToList();

            if (overview.Count > 0 && overview.Count < actor.Resources.Count)
                actor.EncounterResourceIds = overview;
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>Fills missing system attributes on a new rule from its blueprint.</summary>
    public async Task ApplyRuleDefaultsAsync(Rule rule, Guid campaignId)
    {
        var blueprint = await ResolveForAsync(campaignId, BlueprintKinds.Rule);
        if (blueprint is null)
            return;

        ApplyAttributesTo(rule.SystemData, blueprint);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Ensures the rule and note categories declared by a system's blueprints exist in the
    /// campaign. Non-destructive: existing categories are left untouched.
    /// </summary>
    public async Task EnsureCategoriesAsync(Guid gameSystemId, Guid campaignId)
    {
        var blueprints = await _context.SystemBlueprints
            .Where(b => b.GameSystemId == gameSystemId)
            .AsNoTracking()
            .ToListAsync();

        var ruleNames = blueprints
            .SelectMany(b => b.RuleCategories)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var noteNames = blueprints
            .SelectMany(b => b.NoteCategories)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (ruleNames.Count > 0)
        {
            var existing = await _context.RuleCategories
                .Where(rc => rc.CampaignId == campaignId)
                .Select(rc => rc.Name)
                .ToListAsync();

            foreach (var name in ruleNames.Where(n => !existing.Contains(n, StringComparer.OrdinalIgnoreCase)))
            {
                _context.RuleCategories.Add(new RuleCategory
                {
                    Id = Guid.NewGuid(),
                    CampaignId = campaignId,
                    Name = name,
                    ShowInToolbar = true
                });
            }
        }

        if (noteNames.Count > 0)
        {
            var existing = await _context.NoteCategories
                .Where(nc => nc.CampaignId == campaignId)
                .Select(nc => nc.Name)
                .ToListAsync();

            foreach (var name in noteNames.Where(n => !existing.Contains(n, StringComparer.OrdinalIgnoreCase)))
            {
                _context.NoteCategories.Add(new NoteCategory
                {
                    Id = Guid.NewGuid(),
                    CampaignId = campaignId,
                    Name = name
                });
            }
        }

        await _context.SaveChangesAsync();
    }

    private static void ApplyAttributesTo(Dictionary<string, object> target, SystemBlueprint blueprint)
    {
        foreach (var attribute in blueprint.Attributes)
        {
            if (string.IsNullOrWhiteSpace(attribute.Key) || target.ContainsKey(attribute.Key))
                continue;

            target[attribute.Key] = CoerceAttribute(attribute);
        }
    }

    private static object CoerceAttribute(BlueprintAttribute attribute) => attribute.Type switch
    {
        "number" => double.TryParse(attribute.DefaultValue, out var number) ? number : 0d,
        "boolean" => bool.TryParse(attribute.DefaultValue, out var flag) && flag,
        _ => attribute.DefaultValue ?? string.Empty
    };

    private static void Validate(SystemBlueprint blueprint)
    {
        if (!BlueprintKinds.All.Contains(blueprint.Kind))
        {
            throw new ArgumentException(
                $"Blueprint kind must be one of: {string.Join(", ", BlueprintKinds.All)}.");
        }

        if (blueprint.GameSystemId == Guid.Empty)
            throw new ArgumentException("A blueprint must belong to a game system.");
    }
}
