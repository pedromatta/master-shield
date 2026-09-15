namespace MasterShield.Models;

public class Location
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public Campaign Campaign { get; set; } = null!;
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
}
