using System.Text.Json.Serialization;

namespace Daedala.Models;

/// <summary>The entity family a tag belongs to. Tags are never shared across families.</summary>
public enum TagCategory { Actor, Rule, Location, Note, Counter }

/// <summary>
/// Free-form label the GM can attach to actors, notes, locations, rules or counters, then
/// use to filter the grids. A tag belongs to exactly one <see cref="Category"/> and can
/// only be attached to entities of that family.
/// </summary>
public class Tag
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ColorHex { get; set; } = "#cccccc";

    /// <summary>Which entity family this tag may be applied to.</summary>
    public TagCategory Category { get; set; } = TagCategory.Actor;

    [JsonIgnore]
    public Campaign Campaign { get; set; } = null!;

    // Tags are always surfaced through their owning entity (actor, rule, location, note,
    // counter); serializing these back-references would create a cycle.
    [JsonIgnore]
    public ICollection<Actor> Actors { get; set; } = new List<Actor>();
    [JsonIgnore]
    public ICollection<Rule> Rules { get; set; } = new List<Rule>();
    [JsonIgnore]
    public ICollection<Location> Locations { get; set; } = new List<Location>();
    [JsonIgnore]
    public ICollection<Note> Notes { get; set; } = new List<Note>();
    [JsonIgnore]
    public ICollection<Counter> Counters { get; set; } = new List<Counter>();
}
