using Daedala.Models;

namespace Daedala.Services.Interfaces;

public interface IEncounterService
{
    Task<IEnumerable<Encounter>> GetBySessionAsync(Guid sessionId);
    Task<Encounter?> GetByIdAsync(Guid id);
    Task<Encounter> CreateAsync(Encounter encounter);
    Task<bool> UpdateAsync(Encounter encounter);
    Task<bool> DeleteAsync(Guid id);

    /// <summary>
    /// Returns the session's active (or most recent) encounter, creating the first one when
    /// the session has none. Every session can therefore rely on having an encounter.
    /// </summary>
    Task<Encounter> EnsureEncounterAsync(Guid sessionId);

    Task<EncounterParticipant> AddParticipantAsync(Guid encounterId, Guid actorId, decimal initiative, int temporaryHpOffset);
    Task<bool> UpdateParticipantStateAsync(Guid encounterId, Guid participantId, int temporaryHpOffset, Dictionary<string, object> temporaryEffects);
    Task<bool> RemoveParticipantAsync(Guid encounterId, Guid participantId);
    Task<bool> AdvanceRoundAsync(Guid encounterId);

    /// <summary>Sets the encounter's round to an explicit value (used to step back).</summary>
    Task<bool> SetRoundAsync(Guid encounterId, int round);

    /// <summary>
    /// Applies a resource change inside an encounter. Player characters write through to the
    /// actor's own resources; NPCs keep an isolated value on the participant so the same NPC
    /// can appear multiple times with independent state.
    /// </summary>
    Task<bool> AdjustParticipantResourceAsync(
        Guid encounterId, Guid participantId, Guid resourceId, int delta, bool replace);

    /// <summary>Persists a new initiative ordering after the GM drags participants.</summary>
    Task<bool> ReorderParticipantsAsync(Guid encounterId, IEnumerable<Guid> orderedParticipantIds);
}
