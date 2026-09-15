namespace MasterShield.Models;

public class Session
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public int SessionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime DatePlayed { get; set; }
    public string Log { get; set; } = string.Empty;


    public Campaign Campaign { get; set; } = null!;
    public ICollection<Encounter> Encounters { get; set; } = new List<Encounter>();
    public ICollection<Note> Notes { get; set; } = new List<Note>();
}
