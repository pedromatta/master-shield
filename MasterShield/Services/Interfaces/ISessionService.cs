using MasterShield.Models;

namespace MasterShield.Services.Interfaces;

public interface ISessionService
{
    Task<IEnumerable<Session>> GetByCampaignAsync(Guid campaignId);
    Task<Session?> GetByIdAsync(Guid id);
    Task<Session> CreateAsync(Session session);
    Task<bool> UpdateAsync(Session session);
    Task<bool> DeleteAsync(Guid id);

    /// <summary>
    /// Returns the campaign's most recent session, creating the first one when the campaign
    /// has none. Callers can rely on a campaign always having a session to work in.
    /// </summary>
    Task<Session> EnsureSessionAsync(Guid campaignId);
}
