using System.Text.Json.Serialization;

namespace MasterShield.Models;

/// <summary>
/// Links a rule to an actor, so a character can carry its abilities and an NPC can carry the
/// combat rules that make it threatening. Many-to-many: a rule may be linked from any number
/// of actors.
/// </summary>
public class ActorRuleLink
{
    public Guid Id { get; set; }
    public Guid ActorId { get; set; }
    public Guid RuleId { get; set; }

    /// <summary>Order the links should be presented in (abilities first, traits later…).</summary>
    public int SortOrder { get; set; }

    [JsonIgnore]
    public Actor Actor { get; set; } = null!;

    /// <summary>The linked rule; included in responses so clients render its title/icon.</summary>
    public Rule Rule { get; set; } = null!;
}
