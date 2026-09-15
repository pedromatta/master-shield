namespace MasterShield.Models;

public class Resource
{
    public Guid Id { get; set; }
    public Guid ActorId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public int CurrentValue { get; set; }
    public int MaxValue { get; set; }
    public string ColorHwx { get; set; } = "#000000";

    public Actor Actor { get; set; } = null!;

    public Dictionary<string, object> SystemData { get; set; } = new();
}
