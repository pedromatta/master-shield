using System.Text.Json.Serialization;

namespace Daedala.Models;

public class Note
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;

    /// <summary>Groups notes into the sidebar categories of the notes panel.</summary>
    public Guid? NoteCategoryId { get; set; }
    public NoteCategory? NoteCategory { get; set; }

    public Guid? CampaignId { get; set; }
    [JsonIgnore]
    public Campaign? Campaign { get; set; }

    public Guid? SessionId { get; set; }
    [JsonIgnore]
    public Session? Session { get; set; }

    public Guid? LocationId { get; set; }
    [JsonIgnore]
    public Location? Location { get; set; }

    public ICollection<Tag> Tags { get; set; } = new List<Tag>();
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
}