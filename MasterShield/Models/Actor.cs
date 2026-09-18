using System.Text.Json.Serialization;

namespace MasterShield.Models;

public enum ActorType { PlayerCharacter, NonPlayerCharacter }
public class Actor
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public ActorType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;

    /// <summary>Portrait/icon URI shown on sidebar cards, NPC grids and encounter rows.</summary>
    public string ImageUri { get; set; } = string.Empty;

    /// <summary>
    /// Icon id chosen from the RPG Awesome / Lucide catalogues (for example `ra:orc-head`).
    /// Used when no <see cref="ImageUri"/> has been uploaded.
    /// </summary>
    public string IconId { get; set; } = string.Empty;

    public Dictionary<string, object> SystemData { get; set; } = new();

    /// <summary>
    /// Resource ids the GM wants surfaced inside the encounter tracker for this actor. When
    /// empty every resource is shown; the sheet lets the GM curate this list.
    /// </summary>
    public List<Guid> EncounterResourceIds { get; set; } = new();

    /// <summary>
    /// System-data keys the GM pinned to the actor's Overview tab. Mirrors the game system's
    /// blueprint hints, which pre-select a sensible default set when the actor is created.
    /// </summary>
    public List<string> OverviewFields { get; set; } = new();

    [JsonIgnore]
    public Campaign Campaign { get; set; } = null!;
    public ICollection<Resource> Resources { get; set; } = new List<Resource>();
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();

    /// <summary>Rules linked to this actor (abilities, traits, threat tactics, …).</summary>
    public ICollection<ActorRuleLink> RuleLinks { get; set; } = new List<ActorRuleLink>();
}
