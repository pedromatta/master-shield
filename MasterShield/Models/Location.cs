using System.Text.Json.Serialization;

namespace MasterShield.Models;

public class Location
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>Image used as the location's thumbnail and, when current, the battle map.</summary>
    public string ImageUri { get; set; } = string.Empty;

    [JsonIgnore]
    public Campaign Campaign { get; set; } = null!;
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();
}
