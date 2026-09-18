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

    public async Task<IEnumerable<Campaign>> GetByUserAsync(Guid userId) =>
        await _context.Campaigns
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.Name)
            .ToListAsync();

    public async Task<Campaign?> GetByIdAsync(Guid id, Guid userId) =>
        await _context.Campaigns
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

    public async Task<bool> IsOwnedByAsync(Guid campaignId, Guid userId) =>
        await _context.Campaigns.AnyAsync(c => c.Id == campaignId && c.UserId == userId);

    public async Task<Campaign?> GetForMapAsync(Guid id) =>
        await _context.Campaigns.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);

    public async Task<Campaign> CreateAsync(Campaign campaign)
    {
        if (campaign.Id == Guid.Empty)
            campaign.Id = Guid.NewGuid();

        _context.Campaigns.Add(campaign);

        // A campaign always starts with a session and an encounter, so the GM is never
        // left without a place to work. Both are named by their indexer.
        var session = new Session
        {
            Id = Guid.NewGuid(),
            CampaignId = campaign.Id,
            SessionNumber = 1,
            Title = "Session",
            DatePlayed = DateTime.UtcNow
        };
        _context.Sessions.Add(session);

        _context.Encounters.Add(new Encounter
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Name = "Encounter",
            IsActive = true,
            CurrentRound = 1
        });

        await _context.SaveChangesAsync();
        return campaign;
    }

    public async Task<bool> UpdateAsync(Campaign campaign, Guid userId)
    {
        var existing = await _context.Campaigns
            .FirstOrDefaultAsync(c => c.Id == campaign.Id && c.UserId == userId);
        if (existing is null)
            return false;

        existing.Name = campaign.Name;
        existing.GameSystemId = campaign.GameSystemId;
        existing.SystemData = campaign.SystemData;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId)
    {
        var campaign = await _context.Campaigns
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (campaign is null)
            return false;

        _context.Campaigns.Remove(campaign);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetCurrentMapAsync(Guid campaignId, Guid? locationId, Guid userId)
    {
        var campaign = await _context.Campaigns
            .FirstOrDefaultAsync(c => c.Id == campaignId && c.UserId == userId);
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
