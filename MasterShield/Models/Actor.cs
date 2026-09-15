namespace MasterShield.Models;

public enum ActorType { PlayerCharacter, NonPlayerCharacter }
public class Actor
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public ActorType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;

    public Dictionary<string, object> SystemData { get; set; } = new();

    public Campaign Campaign { get; set; } = null!;
    public ICollection<Resource> Resources { get; set; } = new List<Resources>();
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();
}
