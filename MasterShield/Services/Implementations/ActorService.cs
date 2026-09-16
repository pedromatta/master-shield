using MasterShield.Data;
using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Services.Implementations;

public class ActorService : MasterShieldContextService, IActorService
{
    private readonly IBlueprintService _blueprints;

    public ActorService(MasterShieldContext context, IBlueprintService blueprints) : base(context)
    {
        _blueprints = blueprints;
    }

    public async Task<IEnumerable<Actor>> GetByCampaignAsync(Guid campaignId) =>
        await Context.Actors
            .Include(a => a.Resources)
            .Include(a => a.Tags)
            .Include(a => a.Attachments)
            .Include(a => a.RuleLinks)
                .ThenInclude(l => l.Rule)
            .Where(a => a.CampaignId == campaignId)
            .OrderBy(a => a.Type)
            .ThenBy(a => a.Name)
            .AsNoTracking()
            .ToListAsync();

    public async Task<Actor?> GetByIdAsync(Guid id) =>
        await Context.Actors
            .Include(a => a.Resources)
            .Include(a => a.Tags)
            .Include(a => a.Attachments)
            .Include(a => a.RuleLinks)
                .ThenInclude(l => l.Rule)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

    public async Task<Actor> CreateAsync(Actor actor)
    {
        if (actor.Id == Guid.Empty)
            actor.Id = Guid.NewGuid();

        actor.Tags = await ResolveTagsAsync(actor.Tags.Select(t => t.Id), TagCategory.Actor);

        // The game system's actor blueprint dictates defaults: resources (HP, Mana, …) and
        // system attributes (AC, thresholds, …). Client-supplied values always win.
        await _blueprints.ApplyActorDefaultsAsync(actor);

        Context.Actors.Add(actor);
        await Context.SaveChangesAsync();
        return actor;
    }

    public async Task<bool> UpdateAsync(Actor actor)
    {
        var existing = await Context.Actors
            .Include(a => a.Tags)
            .FirstOrDefaultAsync(a => a.Id == actor.Id);

        if (existing is null)
            return false;

        existing.Name = actor.Name;
        existing.Type = actor.Type;
        existing.Notes = actor.Notes;
        existing.ImageUri = actor.ImageUri;
        existing.IconId = actor.IconId;
        existing.SystemData = actor.SystemData;
        existing.EncounterResourceIds = actor.EncounterResourceIds ?? [];

        var tags = await ResolveTagsAsync(actor.Tags.Select(t => t.Id), TagCategory.Actor);
        existing.Tags.Clear();
        foreach (var tag in tags)
        {
            existing.Tags.Add(tag);
        }

        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetTagsAsync(Guid actorId, IEnumerable<Guid> tagIds)
    {
        var actor = await Context.Actors
            .Include(a => a.Tags)
            .FirstOrDefaultAsync(a => a.Id == actorId);

        if (actor is null)
            return false;

        var tags = await ResolveTagsAsync(tagIds, TagCategory.Actor);
        actor.Tags.Clear();
        foreach (var tag in tags)
        {
            actor.Tags.Add(tag);
        }

        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetLinkedRulesAsync(Guid actorId, IEnumerable<Guid> ruleIds)
    {
        var actor = await Context.Actors.FirstOrDefaultAsync(a => a.Id == actorId);
        if (actor is null)
            return false;

        // Only rules that live in the actor's campaign may be linked, so the join never
        // crosses campaign boundaries.
        var ids = ruleIds?.Distinct().ToList() ?? [];
        var validIds = await Context.Rules
            .Where(r => ids.Contains(r.Id) && r.Category!.CampaignId == actor.CampaignId)
            .Select(r => r.Id)
            .ToListAsync();

        // Replace the whole set. A set-based delete avoids tracking the old rows and the
        // optimistic-concurrency check that loaded-navigation clearing would trigger.
        await Context.ActorRuleLinks
            .Where(l => l.ActorId == actorId)
            .ExecuteDeleteAsync();

        var order = 0;
        foreach (var ruleId in validIds)
        {
            Context.ActorRuleLinks.Add(new ActorRuleLink
            {
                Id = Guid.NewGuid(),
                ActorId = actorId,
                RuleId = ruleId,
                SortOrder = order++
            });
        }

        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var actor = await Context.Actors.FirstOrDefaultAsync(a => a.Id == id);
        if (actor is null)
            return false;

        Context.Actors.Remove(actor);
        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<Resource> AddResourceAsync(Guid actorId, Resource resource)
    {
        if (!await Context.Actors.AnyAsync(a => a.Id == actorId))
            throw new KeyNotFoundException($"Actor '{actorId}' was not found.");

        if (resource.Id == Guid.Empty)
            resource.Id = Guid.NewGuid();

        resource.ActorId = actorId;
        Context.Resources.Add(resource);
        await Context.SaveChangesAsync();
        return resource;
    }

    public async Task<bool> UpdateResourceAsync(Guid actorId, Guid resourceId, Resource resource)
    {
        var existing = await Context.Resources
            .FirstOrDefaultAsync(r => r.Id == resourceId && r.ActorId == actorId);

        if (existing is null)
            return false;

        existing.Nome = resource.Nome;
        existing.CurrentValue = resource.CurrentValue;
        existing.MaxValue = resource.MaxValue;
        existing.ColorHwx = resource.ColorHwx;
        existing.SystemData = resource.SystemData;

        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteResourceAsync(Guid actorId, Guid resourceId)
    {
        var resource = await Context.Resources
            .FirstOrDefaultAsync(r => r.Id == resourceId && r.ActorId == actorId);

        if (resource is null)
            return false;

        Context.Resources.Remove(resource);
        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateSystemDataAsync(Guid actorId, Dictionary<string, object> systemData)
    {
        var actor = await Context.Actors.FirstOrDefaultAsync(a => a.Id == actorId);
        if (actor is null)
            return false;

        actor.SystemData = systemData ?? new Dictionary<string, object>();
        await Context.SaveChangesAsync();
        return true;
    }
}
