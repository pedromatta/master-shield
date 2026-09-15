namespace MasterShield.Models;

public class RuleCategory
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Name { get; set; } = string.Empty;

    public Campaign Campaign { get; set; } = null!;
    public ICollection<Rule> Rules { get; set; } = new List<Rule>();
}
