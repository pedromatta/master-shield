namespace MasterShield.Models;

public class Attachment
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileUri { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeInBytes { get; set; }

    public Guid? ActorId { get; set; }
    public Actor? Actor { get; set; }

    public Guid? RuleId { get; set; }
    public Rule? Rule { get; set; }

    public Guid? LocationId { get; set; }
    public Location? Location { get; set; }
}
