namespace MasterShield.Models;

public class SystemBlueprint
{
    public Guid Id { get; set; }
    public Guid GameSystemId { get; set; }

    public string TargetEntity { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public Dictionary<string, object> DefaultPayload { get; set; } = new();

    public GameSystem GameSystem { get; set; } = null!;
}
