using MasterShield.Data;
using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Services.Implementations;

public class SessionService : ISessionService
{
    private readonly MasterShieldContext _context;

    public SessionService(MasterShieldContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Session>> GetByCampaignAsync(Guid campaignId) =>
        await _context.Sessions
            .Include(s => s.Encounters)
            .Where(s => s.CampaignId == campaignId)
            .AsNoTracking()
            .ToListAsync();

    public async Task<Session?> GetByIdAsync(Guid id) =>
        await _context.Sessions
            .Include(s => s.Encounters)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id);

    public async Task<Session> CreateAsync(Session session)
    {
        if (session.Id == Guid.Empty)
            session.Id = Guid.NewGuid();

        // Sessions are never named by hand: the title defaults to "Session" and the number is
        // shown alongside it by the UI.
        if (session.SessionNumber <= 0)
        {
            var highest = await _context.Sessions
                .Where(s => s.CampaignId == session.CampaignId)
                .Select(s => (int?)s.SessionNumber)
                .MaxAsync() ?? 0;

            session.SessionNumber = highest + 1;
        }

        if (string.IsNullOrWhiteSpace(session.Title))
            session.Title = "Session";

        // The client only supplies a title; stamp the play date so sessions are sortable.
        if (session.DatePlayed == default)
            session.DatePlayed = DateTime.UtcNow;

        _context.Sessions.Add(session);
        await _context.SaveChangesAsync();
        return session;
    }

    public async Task<Session> EnsureSessionAsync(Guid campaignId)
    {
        // The most recent session is the one the GM is currently running.
        var latest = await _context.Sessions
            .Where(s => s.CampaignId == campaignId)
            .OrderByDescending(s => s.SessionNumber)
            .FirstOrDefaultAsync();

        if (latest is not null)
            return latest;

        return await CreateAsync(new Session { CampaignId = campaignId });
    }

    public async Task<bool> UpdateAsync(Session session)
    {
        var existing = await _context.Sessions.FirstOrDefaultAsync(s => s.Id == session.Id);
        if (existing is null)
            return false;

        existing.SessionNumber = session.SessionNumber;
        existing.Title = session.Title;
        existing.DatePlayed = session.DatePlayed;
        existing.Log = session.Log;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var session = await _context.Sessions.FirstOrDefaultAsync(s => s.Id == id);
        if (session is null)
            return false;

        _context.Sessions.Remove(session);
        await _context.SaveChangesAsync();
        return true;
    }
}
