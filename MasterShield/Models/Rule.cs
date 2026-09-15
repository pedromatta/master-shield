namespace MasterShield.Models;

public class Rule
{
    public Guid Id { get; set; }
    public Guid RuleCategoryId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;

    public RuleCategory Category { get; set; } = null!;
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();

    public Dictionary<string, object> SystemData { get; set; } = new();
}
