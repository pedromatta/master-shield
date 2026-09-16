using System.Text.Json.Serialization;

namespace MasterShield.Models;

public class Attachment
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileUri { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeInBytes { get; set; }

    public Guid? ActorId { get; set; }
    [JsonIgnore]
    public Actor? Actor { get; set; }

    public Guid? RuleId { get; set; }
    [JsonIgnore]
    public Rule? Rule { get; set; }

    public Guid? LocationId { get; set; }
    [JsonIgnore]
    public Location? Location { get; set; }

    public Guid? NoteId { get; set; }
    [JsonIgnore]
    public Note? Note { get; set; }
}
