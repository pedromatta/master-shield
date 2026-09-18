using System.Text.Json.Serialization;

namespace Daedala.Models;

/// <summary>The entity kinds a blueprint can govern.</summary>
public static class BlueprintKinds
{
    public const string Actor = "Actor";
    public const string Rule = "Rule";
    public const string Location = "Location";
    public const string Note = "Note";

    public static readonly string[] All = [Actor, Rule, Location, Note];
}

/// <summary>
/// A blueprint dictates how every new entity of its kind is created inside a game system.
///
/// Unlike <see cref="SystemEntityTemplate"/> (which is a ready-made, pre-filled entity a GM
/// can copy into a campaign), a blueprint is a *rule*: it declares the resources every new
/// actor starts with, the game-specific attributes (AC, damage thresholds, …) and whether
/// those attributes surface on the actor overview, plus the default rule/note categories the
/// system expects.
///
/// A system has at most one blueprint per (kind, actor type): an `Actor`/`PlayerCharacter`
/// blueprint and an `Actor`/`NonPlayerCharacter` blueprint may differ, for example.
/// </summary>
public class SystemBlueprint
{
    public Guid Id { get; set; }
    public Guid GameSystemId { get; set; }

    /// <summary>One of <see cref="BlueprintKinds"/>.</summary>
    public string Kind { get; set; } = BlueprintKinds.Actor;

    /// <summary>
    /// Actor sub-type (`PlayerCharacter` / `NonPlayerCharacter`) for Actor blueprints; empty
    /// means the blueprint applies to both.
    /// </summary>
    public string ActorType { get; set; } = string.Empty;

    /// <summary>Human label, mainly for the editor.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Resources every new actor starts with (HP, Mana, …). Seeded by name; an actor that
    /// already declares the resource keeps its own values.
    /// </summary>
    public List<BlueprintResource> Resources { get; set; } = new();

    /// <summary>
    /// Game-specific attributes seeded into every new entity's <c>SystemData</c>, with the
    /// option to surface each on the actor overview.
    /// </summary>
    public List<BlueprintAttribute> Attributes { get; set; } = new();

    /// <summary>
    /// Default rule categories created for a campaign that adopts the system (DnD: Classes,
    /// Races, Origins; Daggerheart: Domains, Classes, Communities, Ancestries).
    /// </summary>
    public List<string> RuleCategories { get; set; } = new();

    /// <summary>Default note categories created for an adopting campaign.</summary>
    public List<string> NoteCategories { get; set; } = new();

    [JsonIgnore]
    public GameSystem GameSystem { get; set; } = null!;
}

/// <summary>A resource a blueprint seeds onto new actors.</summary>
public class BlueprintResource
{
    public string Nome { get; set; } = string.Empty;
    public int MaxValue { get; set; } = 10;
    public int CurrentValue { get; set; } = 10;
    public string ColorHwx { get; set; } = "#38bdf8";
    /// <summary>Whether this resource appears on the actor overview by default.</summary>
    public bool ShowInOverview { get; set; } = true;
}

/// <summary>A game-specific attribute a blueprint seeds into <c>SystemData</c>.</summary>
public class BlueprintAttribute
{
    public string Key { get; set; } = string.Empty;
    /// <summary>`text` | `number` | `boolean`.</summary>
    public string Type { get; set; } = "text";
    /// <summary>Serialised default value (string/number/bool).</summary>
    public string DefaultValue { get; set; } = string.Empty;
    /// <summary>Whether this attribute appears on the actor overview / card.</summary>
    public bool ShowInOverview { get; set; }
}
