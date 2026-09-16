using System.Text.Json.Serialization;

namespace MasterShield.Models;

public class EncounterParticipant
{
    public Guid Id { get; set; }
    public Guid EncounterId { get; set; }
    public Guid ActorId { get; set; }

    public decimal Initiative { get; set; }
    public int TemporaryHpOffset { get; set; }
    public bool IsHiden { get; set; }

    public Dictionary<string, object> TemporaryEffects { get; set; } = new();

    /// <summary>
    /// Isolated resource state for NPC participants. Player-character resources live on the
    /// actor and are always read/written there; NPCs instead keep a private copy here so the
    /// same actor can appear several times in one encounter with independent hit points.
    /// Keyed by resource id.
    /// </summary>
    public Dictionary<Guid, int> ResourceOverrides { get; set; } = new();

    [JsonIgnore]
    public Encounter Encounter { get; set; } = null!;
    public Actor Actor { get; set; } = null!;
}
