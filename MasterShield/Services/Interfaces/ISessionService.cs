using MasterShield.Models;

namespace MasterShield.Services.Interfaces;

public interface ISessionService
{
    Task<IEnumerable<Session>> GetByCampaignAsync(Guid campaignId);
    Task<Session?> GetByIdAsync(Guid id);
    Task<Session> CreateAsync(Session session);
    Task<bool> UpdateAsync(Session session);
    Task<bool> DeleteAsync(Guid id);
}
