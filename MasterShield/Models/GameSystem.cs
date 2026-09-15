namespace MasterShield.Models;

public class GameSystem
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;

    public ICollection<Campaign> Campaigns { get; set; } = new List<Campaign>();
    public ICollection<SystemBlueprint> Blueprints { get; set; } = new List<SystemBlueprint>();
}
