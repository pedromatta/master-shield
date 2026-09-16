using System.Text.Json.Serialization;

namespace MasterShield.Models;

/// <summary>
/// The kinds of content a game system can ship as ready-made templates.
/// </summary>
public static class TemplateKinds
{
    public const string Actor = "Actor";
    public const string Location = "Location";
    public const string Rule = "Rule";
    public const string Note = "Note";

    public static readonly string[] All = [Actor, Location, Rule, Note];
}

/// <summary>
/// A ready-made entity belonging to a game system (for example a bestiary entry). Templates
/// are authored against the system, not against a campaign: when a campaign adopts the
/// system the GM can copy any subset of templates into it as real actors, locations, rules
/// and notes.
/// </summary>
public class SystemEntityTemplate
{
    public Guid Id { get; set; }
    public Guid GameSystemId { get; set; }

    /// <summary>One of <see cref="TemplateKinds"/>.</summary>
    public string Kind { get; set; } = TemplateKinds.Actor;

    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>Portrait/thumbnail/icon image URI for the instantiated entity.</summary>
    public string ImageUri { get; set; } = string.Empty;

    /// <summary>
    /// For actors: which actor type to instantiate. For rules: the category name. For notes:
    /// the category name. Left empty to use the system default.
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>Ordering hint so bestiaries and rule lists keep their authored sequence.</summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Resource templates for actor templates, stored inline as a JSON array so a bestiary
    /// entry can define its Hit Points, Sanity, etc. without extra rows.
    /// </summary>
    public List<TemplateResource> Resources { get; set; } = new();

    /// <summary>Arbitrary game-specific data exposed as the instantiated entity's SystemData.</summary>
    public Dictionary<string, object> SystemData { get; set; } = new();

    [JsonIgnore]
    public GameSystem GameSystem { get; set; } = null!;
}

/// <summary>A resource bar declared by an actor template.</summary>
public class TemplateResource
{
    public string Nome { get; set; } = string.Empty;
    public int CurrentValue { get; set; }
    public int MaxValue { get; set; }
    public string ColorHwx { get; set; } = "#38bdf8";
}
