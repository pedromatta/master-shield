namespace MasterShield.Models;

public class Note
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;

    public Guid? CampaignId { get; set; }
    public Campaign? Campaign { get; set; }

    public Guid? SessionId { get; set; }
    public Session? Session { get; set; }

    public Guid? LocationId { get; set; }
    public Location? Location { get; set; }

    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
}
