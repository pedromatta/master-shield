using System.Text.Json.Serialization;

namespace MasterShield.Models;

public class Rule
{
    public Guid Id { get; set; }
    public Guid RuleCategoryId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;

    /// <summary>Icon id chosen from the RPG Awesome / Lucide catalogues.</summary>
    public string IconId { get; set; } = string.Empty;

    /// <summary>Optional uploaded image that takes precedence over <see cref="IconId"/>.</summary>
    public string ImageUri { get; set; } = string.Empty;

    [JsonIgnore]
    public RuleCategory Category { get; set; } = null!;
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();

    public Dictionary<string, object> SystemData { get; set; } = new();
}
