namespace MasterShield.Models;

public class GameSystem
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;

    public ICollection<Campaign> Campaigns { get; set; } = new List<Campaign>();
    public ICollection<SystemBlueprint> Blueprints { get; set; } = new List<SystemBlueprint>();
}

public class SystemBlueprint
{
    public Guid Id { get; set; }
    public Guid GameSystemId { get; set; }

    public string TargetEntity { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public Dictionary<string, object> DefaultPayload { get; set; } = new();

    public GameSystem GameSystem { get; set; } = null!;
}
