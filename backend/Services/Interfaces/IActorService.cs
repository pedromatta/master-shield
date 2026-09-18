using Daedala.Models;

namespace Daedala.Services.Interfaces;

public interface IActorService
{
    Task<IEnumerable<Actor>> GetByCampaignAsync(Guid campaignId);
    Task<Actor?> GetByIdAsync(Guid id);
    Task<Actor> CreateAsync(Actor actor);
    Task<bool> UpdateAsync(Actor actor);
    Task<bool> DeleteAsync(Guid id);

    Task<Resource> AddResourceAsync(Guid actorId, Resource resource);
    Task<bool> UpdateResourceAsync(Guid actorId, Guid resourceId, Resource resource);
    Task<bool> DeleteResourceAsync(Guid actorId, Guid resourceId);
    Task<bool> UpdateSystemDataAsync(Guid actorId, Dictionary<string, object> systemData);
    Task<bool> SetTagsAsync(Guid actorId, IEnumerable<Guid> tagIds);

    /// <summary>Replaces the set of rules linked to an actor (abilities, traits, …).</summary>
    Task<bool> SetLinkedRulesAsync(Guid actorId, IEnumerable<Guid> ruleIds);
}
