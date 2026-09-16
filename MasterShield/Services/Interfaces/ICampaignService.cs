using MasterShield.Models;

namespace MasterShield.Services.Interfaces;

public interface ICampaignService
{
    Task<IEnumerable<Campaign>> GetAllAsync();
    Task<Campaign?> GetByIdAsync(Guid id);
    Task<Campaign> CreateAsync(Campaign campaign);
    Task<bool> UpdateAsync(Campaign campaign);
    Task<bool> DeleteAsync(Guid id);

    /// <summary>
    /// Points the campaign at a location's image so the stable map URI the virtual
    /// tabletop consumes now resolves to that image.
    /// </summary>
    Task<bool> SetCurrentMapAsync(Guid campaignId, Guid? locationId);
}
