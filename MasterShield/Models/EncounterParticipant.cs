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

    public Encounter Encounter { get; set; } = null!;
    public Actor Actor { get; set; } = null!;
}
