using MasterShield.Data;
using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Services.Implementations;

public class CampaignService : ICampaignService
{
    private readonly MasterShieldContext _context;

    public CampaignService(MasterShieldContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Campaign>> GetAllAsync() =>
        await _context.Campaigns.AsNoTracking().ToListAsync();

    public async Task<Campaign?> GetByIdAsync(Guid id) =>
        await _context.Campaigns.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);

    public async Task<Campaign> CreateAsync(Campaign campaign)
    {
        if (campaign.Id == Guid.Empty)
            campaign.Id = Guid.NewGuid();

        _context.Campaigns.Add(campaign);
        await _context.SaveChangesAsync();
        return campaign;
    }

    public async Task<bool> UpdateAsync(Campaign campaign)
    {
        var existing = await _context.Campaigns.FirstOrDefaultAsync(c => c.Id == campaign.Id);
        if (existing is null)
            return false;

        existing.Name = campaign.Name;
        existing.GameSystemId = campaign.GameSystemId;
        existing.SystemData = campaign.SystemData;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var campaign = await _context.Campaigns.FirstOrDefaultAsync(c => c.Id == id);
        if (campaign is null)
            return false;

        _context.Campaigns.Remove(campaign);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetCurrentMapAsync(Guid campaignId, Guid? locationId)
    {
        var campaign = await _context.Campaigns.FirstOrDefaultAsync(c => c.Id == campaignId);
        if (campaign is null)
            return false;

        if (locationId is not null
            && !await _context.Locations.AnyAsync(l => l.Id == locationId && l.CampaignId == campaignId))
        {
            return false;
        }

        campaign.CurrentMapLocationId = locationId;
        await _context.SaveChangesAsync();
        return true;
    }
}
