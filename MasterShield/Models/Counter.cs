namespace MasterShield.Models;

public class Counter
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int CurrentValue { get; set; }
    public int? MaxValue { get; set; }

    public Campaign Campaign { get; set; } = null!;
}
