using MasterShield.Models;

namespace MasterShield.Services.Interfaces;

/// <summary>
/// Campaign ownership. Every read and write is scoped to a user id so one GM can never see or
/// touch another GM's campaigns.
/// </summary>
public interface ICampaignService
{
    /// <summary>Campaigns owned by <paramref name="userId"/>.</summary>
    Task<IEnumerable<Campaign>> GetByUserAsync(Guid userId);

    /// <summary>The campaign, but only when it belongs to <paramref name="userId"/>.</summary>
    Task<Campaign?> GetByIdAsync(Guid id, Guid userId);

    /// <summary>
    /// Looks a campaign up by id ignoring ownership. Used only by the public map endpoints,
    /// which are consumed by virtual tabletops that cannot present a session cookie; the
    /// campaign GUID acts as an unguessable capability token there.
    /// </summary>
    Task<Campaign?> GetForMapAsync(Guid id);

    Task<Campaign> CreateAsync(Campaign campaign);
    Task<bool> UpdateAsync(Campaign campaign, Guid userId);
    Task<bool> DeleteAsync(Guid id, Guid userId);

    /// <summary>
    /// Points the campaign at a location's image so the stable map URI the virtual
    /// tabletop consumes now resolves to that image.
    /// </summary>
    Task<bool> SetCurrentMapAsync(Guid campaignId, Guid? locationId, Guid userId);

    /// <summary>
    /// True when the campaign exists and belongs to the user. Used to guard the nested
    /// content controllers (actors, notes, sessions, …).
    /// </summary>
    Task<bool> IsOwnedByAsync(Guid campaignId, Guid userId);
}
