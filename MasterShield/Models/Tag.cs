namespace MasterShield.Models;

public class Tag
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ColorHex { get; set; } = "#cccccc";

    public Campaign Campaign { get; set; } = null!;

    public ICollection<Actor> Actors { get; set; } = new List<Actor>();
    public ICollection<Rule> Rules { get; set; } = new List<Rule>();
    public ICollection<Location> Locations { get; set; } = new List<Location>();
}
