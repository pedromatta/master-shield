namespace MasterShield.Models;

public class Campaign
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string System { get; set; } = "Outro";

    public User User { get; set; } = null!;

    public ICollection<Actor> Actors { get; set; } = new List<Actor>();
    public ICollection<Location> Locations { get; set; } = new List<Location>();
    public ICollection<RuleCategory> RuleCategory { get; set; } = new List<RuleCategory>();
    public ICollection<Counter> Counters { get; set; } = new List<Counter>();
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();
}
