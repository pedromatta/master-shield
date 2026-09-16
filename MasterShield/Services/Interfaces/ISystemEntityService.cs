using MasterShield.Models;

namespace MasterShield.Services.Interfaces;

/// <summary>
/// Authors and applies the ready-made entities a game system ships with. A template is a
/// campaign-agnostic actor, location, rule or note that can be copied into any campaign that
/// adopts the system.
/// </summary>
public interface ISystemEntityService
{
    Task<IEnumerable<SystemEntityTemplate>> GetByGameSystemAsync(Guid gameSystemId, string? kind = null);
    Task<SystemEntityTemplate?> GetByIdAsync(Guid id);
    Task<SystemEntityTemplate> CreateAsync(SystemEntityTemplate template);

    /// <summary>Creates many templates at once, used by the import flow.</summary>
    Task<IEnumerable<SystemEntityTemplate>> CreateManyAsync(Guid gameSystemId, IEnumerable<SystemEntityTemplate> templates);

    Task<bool> UpdateAsync(SystemEntityTemplate template);
    Task<bool> DeleteAsync(Guid id);

    /// <summary>
    /// Copies the requested templates (or every template when <paramref name="templateIds"/>
    /// is empty) into a campaign as real actors, locations, rules and notes.
    /// </summary>
    Task<SystemSeedResult> ApplyToCampaignAsync(
        Guid gameSystemId, Guid campaignId, IEnumerable<Guid>? templateIds = null);

    /// <summary>
    /// Copies existing campaign content back out into a game system as templates, so a GM can
    /// capture a homebrew bestiary and reuse it in another campaign.
    /// </summary>
    Task<IEnumerable<SystemEntityTemplate>> CaptureFromCampaignAsync(
        Guid gameSystemId, Guid campaignId, IEnumerable<Guid>? entityIds = null);
}

/// <summary>Counts of entities created when a system was applied to a campaign.</summary>
public record SystemSeedResult(int Actors, int Locations, int Rules, int Notes)
{
    public int Total => Actors + Locations + Rules + Notes;
}
