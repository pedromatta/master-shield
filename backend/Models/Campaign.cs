using System.Text.Json.Serialization;

namespace Daedala.Models;

public class Campaign
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;

    public Guid? GameSystemId { get; set; }
    public GameSystem? GameSystem { get; set; }
    public Dictionary<string, object> SystemData { get; set; } = new();

    /// <summary>
    /// The location whose image is currently projected as the battle map. The URL the
    /// virtual tabletop points at never changes; swapping this value swaps the image.
    /// </summary>
    public Guid? CurrentMapLocationId { get; set; }

    [JsonIgnore]
    public User User { get; set; } = null!;

    public ICollection<Actor> Actors { get; set; } = new List<Actor>();
    public ICollection<Location> Locations { get; set; } = new List<Location>();
    public ICollection<RuleCategory> RuleCategory { get; set; } = new List<RuleCategory>();
    public ICollection<Counter> Counters { get; set; } = new List<Counter>();
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
    public ICollection<Note> Notes { get; set; } = new List<Note>();
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();
}
