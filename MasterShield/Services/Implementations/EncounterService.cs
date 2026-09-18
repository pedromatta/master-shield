using MasterShield.Data;
using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Services.Implementations;

public class EncounterService : IEncounterService
{
    private readonly MasterShieldContext _context;

    public EncounterService(MasterShieldContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Encounter>> GetBySessionAsync(Guid sessionId) =>
        await _context.Encounters
            .Include(e => e.Participants.OrderByDescending(p => p.Initiative))
                .ThenInclude(p => p.Actor)
                    .ThenInclude(a => a.Resources)
            .Where(e => e.SessionId == sessionId)
            .AsNoTracking()
            .ToListAsync();

    public async Task<Encounter?> GetByIdAsync(Guid id) =>
        await _context.Encounters
            .Include(e => e.Participants.OrderByDescending(p => p.Initiative))
                .ThenInclude(p => p.Actor)
                    .ThenInclude(a => a.Resources)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id);

    public async Task<Encounter> CreateAsync(Encounter encounter)
    {
        if (encounter.Id == Guid.Empty)
            encounter.Id = Guid.NewGuid();

        encounter.CurrentRound = encounter.CurrentRound < 1 ? 1 : encounter.CurrentRound;

        // Encounters are never named by hand: default to "Encounter"; the indexer is shown
        // alongside it by the UI.
        var count = await _context.Encounters.CountAsync(e => e.SessionId == encounter.SessionId);
        if (string.IsNullOrWhiteSpace(encounter.Name))
            encounter.Name = "Encounter";

        _context.Encounters.Add(encounter);
        await _context.SaveChangesAsync();
        return encounter;
    }

    public async Task<Encounter> EnsureEncounterAsync(Guid sessionId)
    {
        var existing = await _context.Encounters
            .Where(e => e.SessionId == sessionId)
            .OrderByDescending(e => e.IsActive)
            .ThenBy(e => e.Name)
            .FirstOrDefaultAsync();

        if (existing is not null)
            return existing;

        return await CreateAsync(new Encounter
        {
            SessionId = sessionId,
            IsActive = true,
            CurrentRound = 1
        });
    }

    public async Task<bool> UpdateAsync(Encounter encounter)
    {
        var existing = await _context.Encounters.FirstOrDefaultAsync(e => e.Id == encounter.Id);
        if (existing is null)
            return false;

        existing.Name = encounter.Name;
        existing.IsActive = encounter.IsActive;
        existing.CurrentRound = encounter.CurrentRound;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var encounter = await _context.Encounters.FirstOrDefaultAsync(e => e.Id == id);
        if (encounter is null)
            return false;

        _context.Encounters.Remove(encounter);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<EncounterParticipant> AddParticipantAsync(
        Guid encounterId, Guid actorId, decimal initiative, int temporaryHpOffset)
    {
        var encounter = await _context.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId)
            ?? throw new KeyNotFoundException($"Encounter '{encounterId}' was not found.");

        if (!await _context.Actors.AnyAsync(a => a.Id == actorId))
            throw new KeyNotFoundException($"Actor '{actorId}' was not found.");

        var participant = new EncounterParticipant
        {
            Id = Guid.NewGuid(),
            EncounterId = encounter.Id,
            ActorId = actorId,
            Initiative = initiative,
            TemporaryHpOffset = temporaryHpOffset,
            TemporaryEffects = new Dictionary<string, object>()
        };

        _context.EncounterParticipants.Add(participant);
        await _context.SaveChangesAsync();
        return participant;
    }

    public async Task<bool> UpdateParticipantStateAsync(
        Guid encounterId, Guid participantId, int temporaryHpOffset, Dictionary<string, object> temporaryEffects)
    {
        var participant = await _context.EncounterParticipants
            .FirstOrDefaultAsync(p => p.Id == participantId && p.EncounterId == encounterId);

        if (participant is null)
            return false;

        // Encounter state is isolated from the base Actor: only temporary fields are mutated here.
        participant.TemporaryHpOffset = temporaryHpOffset;
        participant.TemporaryEffects = temporaryEffects ?? new Dictionary<string, object>();

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveParticipantAsync(Guid encounterId, Guid participantId)
    {
        var participant = await _context.EncounterParticipants
            .FirstOrDefaultAsync(p => p.Id == participantId && p.EncounterId == encounterId);

        if (participant is null)
            return false;

        _context.EncounterParticipants.Remove(participant);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AdvanceRoundAsync(Guid encounterId)
    {
        var encounter = await _context.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId);
        if (encounter is null)
            return false;

        encounter.CurrentRound++;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetRoundAsync(Guid encounterId, int round)
    {
        var encounter = await _context.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId);
        if (encounter is null)
            return false;

        encounter.CurrentRound = Math.Max(1, round);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AdjustParticipantResourceAsync(
        Guid encounterId, Guid participantId, Guid resourceId, int delta, bool replace)
    {
        var participant = await _context.EncounterParticipants
            .Include(p => p.Actor)
                .ThenInclude(a => a.Resources)
            .FirstOrDefaultAsync(p => p.Id == participantId && p.EncounterId == encounterId);

        if (participant is null || participant.Actor is null)
            return false;

        var resource = participant.Actor.Resources.FirstOrDefault(r => r.Id == resourceId);
        if (resource is null)
            return false;

        // Player characters share their resources with the sheet; NPCs are isolated per
        // participant so several copies of one stat block stay independent.
        if (participant.Actor.Type == ActorType.PlayerCharacter)
        {
            resource.CurrentValue = Clamp(replace ? delta : resource.CurrentValue + delta, resource.MaxValue);
            await _context.SaveChangesAsync();
            return true;
        }

        var current = participant.ResourceOverrides.TryGetValue(resourceId, out var stored)
            ? stored
            : resource.CurrentValue;

        participant.ResourceOverrides[resourceId] =
            Clamp(replace ? delta : current + delta, resource.MaxValue);

        await _context.SaveChangesAsync();
        return true;
    }

    private static int Clamp(int value, int max) => Math.Max(0, Math.Min(max, value));

    public async Task<bool> ReorderParticipantsAsync(
        Guid encounterId, IEnumerable<Guid> orderedParticipantIds)
    {
        var encounter = await _context.Encounters
            .Include(e => e.Participants)
            .FirstOrDefaultAsync(e => e.Id == encounterId);

        if (encounter is null)
            return false;

        // Reordering rewrites initiative so the manual order survives a reload. Participants
        // are laid out in descending initiative, so the first entry gets the highest score.
        // A fresh positive base avoids ties and negative values regardless of prior state.
        var order = orderedParticipantIds.ToList();
        var baseInitiative = Math.Max(
            100m,
            encounter.Participants.Count == 0 ? 0m : encounter.Participants.Max(p => p.Initiative) + 100m);

        var step = 0.01m;
        for (var index = 0; index < order.Count; index++)
        {
            var participant = encounter.Participants.FirstOrDefault(p => p.Id == order[index]);
            if (participant is not null)
            {
                participant.Initiative = baseInitiative - (index * step);
            }
        }

        await _context.SaveChangesAsync();
        return true;
    }
}
