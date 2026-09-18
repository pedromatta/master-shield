using System.Text.Json.Serialization;

namespace Daedala.Models;

/// <summary>
/// A tracker the GM fills in box by box: clocks, doom counters, ammunition, progress
/// tracks. <see cref="Boxes"/> defines how many pips exist; <see cref="CurrentValue"/>
/// is how many are ticked.
/// </summary>
public class Counter
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>Total number of boxes to check off.</summary>
    public int Boxes { get; set; } = 4;

    /// <summary>How many boxes are currently checked.</summary>
    public int CurrentValue { get; set; }

    /// <summary>Retained for backwards compatibility with value/max style counters.</summary>
    public int? MaxValue { get; set; }

    public string ColorHex { get; set; } = "#38bdf8";

    [JsonIgnore]
    public Campaign Campaign { get; set; } = null!;

    public ICollection<Tag> Tags { get; set; } = new List<Tag>();
}
