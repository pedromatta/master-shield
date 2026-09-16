using MasterShield.Models;

namespace MasterShield.Services.Interfaces;

public interface IBlueprintService
{
    Task<IEnumerable<SystemBlueprint>> GetByGameSystemAsync(Guid gameSystemId);
    Task<IEnumerable<SystemBlueprint>> GetAllAsync();
    Task<SystemBlueprint?> GetByIdAsync(Guid id);
    Task<SystemBlueprint> CreateAsync(SystemBlueprint blueprint);
    Task<bool> UpdateAsync(SystemBlueprint blueprint);
    Task<bool> DeleteAsync(Guid id);

    /// <summary>
    /// Resolves the blueprint governing a new entity, preferring an actor-type-specific
    /// blueprint over a kind-wide one.
    /// </summary>
    Task<SystemBlueprint?> ResolveForAsync(Guid campaignId, string kind, string? actorType = null);

    /// <summary>Seeds a new actor's default resources and system attributes from its blueprint.</summary>
    Task ApplyActorDefaultsAsync(Actor actor);

    /// <summary>Seeds a new rule's system attributes from its blueprint.</summary>
    Task ApplyRuleDefaultsAsync(Rule rule, Guid campaignId);

    /// <summary>Creates the rule/note categories a system's blueprints declare for a campaign.</summary>
    Task EnsureCategoriesAsync(Guid gameSystemId, Guid campaignId);
}
