namespace MasterShield.Models;

public class Encounter
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int CurrentRound { get; set; }

    public Session Session { get; set; } = null!;
    public ICollection<EncounterParticipant> Participants { get; set; } = new List<EncounterParticipant>();
}
