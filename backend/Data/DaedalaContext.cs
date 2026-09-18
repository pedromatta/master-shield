using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Daedala.Models;

namespace Daedala.Data;

public class DaedalaContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public DaedalaContext(DbContextOptions<DaedalaContext> options) : base(options) { }

    public DbSet<Actor> Actors { get; set; }
    public DbSet<ActorRuleLink> ActorRuleLinks { get; set; }
    public DbSet<Attachment> Attachments { get; set; }
    public DbSet<Campaign> Campaigns { get; set; }
    public DbSet<Counter> Counters { get; set; }
    public DbSet<Encounter> Encounters { get; set; }
    public DbSet<EncounterParticipant> EncounterParticipants { get; set; }
    public DbSet<GameSystem> GameSystems { get; set; }
    public DbSet<Location> Locations { get; set; }
    public DbSet<Note> Notes { get; set; }
    public DbSet<NoteCategory> NoteCategories { get; set; }
    public DbSet<Resource> Resources { get; set; }
    public DbSet<Rule> Rules { get; set; }
    public DbSet<RuleCategory> RuleCategories { get; set; }
    public DbSet<Session> Sessions { get; set; }
    public DbSet<SystemBlueprint> SystemBlueprints { get; set; }
    public DbSet<SystemEntityTemplate> SystemEntityTemplates { get; set; }
    public DbSet<Tag> Tags { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var jsonPayload = new ValueConverter<Dictionary<string, object>, string>(
            value => JsonSerializer.Serialize(value, JsonOptions),
            json => Deserialize(json));

        var dictComparer = new ValueComparer<Dictionary<string, object>>(
            (c1, c2) => JsonSerializer.Serialize(c1, JsonOptions) == JsonSerializer.Serialize(c2, JsonOptions),
            c => c == null ? 0 : JsonSerializer.Serialize(c, JsonOptions).GetHashCode(),
            c => c == null ? new Dictionary<string, object>() : Deserialize(JsonSerializer.Serialize(c, JsonOptions))
        );

        // Encounter participants keep their own NPC resource values, keyed by resource id.
        var resourceOverrideConverter = new ValueConverter<Dictionary<Guid, int>, string>(
            value => JsonSerializer.Serialize(value, JsonOptions),
            json => DeserializeIntMap(json));

        var resourceOverrideComparer = new ValueComparer<Dictionary<Guid, int>>(
            (c1, c2) => JsonSerializer.Serialize(c1, JsonOptions) == JsonSerializer.Serialize(c2, JsonOptions),
            c => c == null ? 0 : JsonSerializer.Serialize(c, JsonOptions).GetHashCode(),
            c => c == null ? new Dictionary<Guid, int>() : DeserializeIntMap(JsonSerializer.Serialize(c, JsonOptions)));

        // Resource templates and the GM's encounter-resource selection are simple lists.
        var templateResourceConverter = new ValueConverter<List<TemplateResource>, string>(
            value => JsonSerializer.Serialize(value, JsonOptions),
            json => DeserializeTemplateResources(json));

        var templateResourceComparer = new ValueComparer<List<TemplateResource>>(
            (c1, c2) => JsonSerializer.Serialize(c1, JsonOptions) == JsonSerializer.Serialize(c2, JsonOptions),
            c => c == null ? 0 : JsonSerializer.Serialize(c, JsonOptions).GetHashCode(),
            c => c == null ? new List<TemplateResource>() : DeserializeTemplateResources(JsonSerializer.Serialize(c, JsonOptions)));

        var guidListConverter = new ValueConverter<List<Guid>, string>(
            value => JsonSerializer.Serialize(value, JsonOptions),
            json => DeserializeGuidList(json));

        var guidListComparer = new ValueComparer<List<Guid>>(
            (c1, c2) => JsonSerializer.Serialize(c1, JsonOptions) == JsonSerializer.Serialize(c2, JsonOptions),
            c => c == null ? 0 : JsonSerializer.Serialize(c, JsonOptions).GetHashCode(),
            c => c == null ? new List<Guid>() : DeserializeGuidList(JsonSerializer.Serialize(c, JsonOptions)));

        var stringListConverter = new ValueConverter<List<string>, string>(
            value => JsonSerializer.Serialize(value, JsonOptions),
            json => DeserializeStringList(json));

        var stringListComparer = new ValueComparer<List<string>>(
            (c1, c2) => JsonSerializer.Serialize(c1, JsonOptions) == JsonSerializer.Serialize(c2, JsonOptions),
            c => c == null ? 0 : JsonSerializer.Serialize(c, JsonOptions).GetHashCode(),
            c => c == null ? new List<string>() : DeserializeStringList(JsonSerializer.Serialize(c, JsonOptions)));

        modelBuilder.Entity<Actor>()
            .Property(a => a.SystemData)
            .HasConversion(jsonPayload)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(dictComparer);

        modelBuilder.Entity<Campaign>()
            .Property(c => c.SystemData)
            .HasConversion(jsonPayload)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(dictComparer);

        modelBuilder.Entity<EncounterParticipant>()
            .Property(p => p.TemporaryEffects)
            .HasConversion(jsonPayload)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(dictComparer);

        modelBuilder.Entity<Resource>()
            .Property(r => r.SystemData)
            .HasConversion(jsonPayload)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(dictComparer);

        modelBuilder.Entity<Rule>()
            .Property(r => r.SystemData)
            .HasConversion(jsonPayload)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(dictComparer);

        // Blueprint sub-collections are stored as JSON documents alongside the row.
        modelBuilder.Entity<SystemBlueprint>()
            .Property(b => b.Resources)
            .HasConversion(BlueprintJson.ResourceList)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(BlueprintJson.ResourceComparer);

        modelBuilder.Entity<SystemBlueprint>()
            .Property(b => b.Attributes)
            .HasConversion(BlueprintJson.AttributeList)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(BlueprintJson.AttributeComparer);

        modelBuilder.Entity<SystemBlueprint>()
            .Property(b => b.RuleCategories)
            .HasConversion(BlueprintJson.StringList)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(BlueprintJson.StringComparer);

        modelBuilder.Entity<SystemBlueprint>()
            .Property(b => b.NoteCategories)
            .HasConversion(BlueprintJson.StringList)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(BlueprintJson.StringComparer);

        modelBuilder.Entity<SystemBlueprint>()
            .HasOne(b => b.GameSystem)
            .WithMany(g => g.Blueprints)
            .HasForeignKey(b => b.GameSystemId)
            .OnDelete(DeleteBehavior.Cascade);

        // Rule-to-actor links cascade away with either endpoint.
        modelBuilder.Entity<ActorRuleLink>()
            .HasOne(l => l.Actor)
            .WithMany(a => a.RuleLinks)
            .HasForeignKey(l => l.ActorId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ActorRuleLink>()
            .HasOne(l => l.Rule)
            .WithMany()
            .HasForeignKey(l => l.RuleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SystemEntityTemplate>()
            .Property(t => t.SystemData)
            .HasConversion(jsonPayload)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(dictComparer);

        modelBuilder.Entity<SystemEntityTemplate>()
            .Property(t => t.Resources)
            .HasConversion(templateResourceConverter)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(templateResourceComparer);

        modelBuilder.Entity<SystemEntityTemplate>()
            .HasOne(t => t.GameSystem)
            .WithMany(g => g.Templates)
            .HasForeignKey(t => t.GameSystemId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Actor>()
            .Property(a => a.EncounterResourceIds)
            .HasConversion(guidListConverter)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(guidListComparer);

        modelBuilder.Entity<Actor>()
            .Property(a => a.OverviewFields)
            .HasConversion(stringListConverter)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(stringListComparer);

        modelBuilder.Entity<EncounterParticipant>()
            .Property(p => p.ResourceOverrides)
            .HasConversion(resourceOverrideConverter)
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(resourceOverrideComparer);

        modelBuilder.Entity<Actor>()
            .HasMany(a => a.Tags)
            .WithMany(t => t.Actors);

        modelBuilder.Entity<Rule>()
            .HasMany(r => r.Tags)
            .WithMany(t => t.Rules);

        modelBuilder.Entity<Location>()
            .HasMany(l => l.Tags)
            .WithMany(t => t.Locations);

        modelBuilder.Entity<Note>()
            .HasMany(n => n.Tags)
            .WithMany(t => t.Notes);

        modelBuilder.Entity<Counter>()
            .HasMany(c => c.Tags)
            .WithMany(t => t.Counters);

        // Tags are partitioned by the entity family they may be applied to; persisting the
        // enum as text keeps the database readable and stable against reordering.
        modelBuilder.Entity<Tag>()
            .Property(t => t.Category)
            .HasConversion<string>()
            .HasMaxLength(32);

        modelBuilder.Entity<Attachment>()
            .HasOne(a => a.Note)
            .WithMany(n => n.Attachments)
            .HasForeignKey(a => a.NoteId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Attachment>()
            .HasOne(a => a.Actor)
            .WithMany(actor => actor.Attachments)
            .HasForeignKey(a => a.ActorId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Attachment>()
            .HasOne(a => a.Rule)
            .WithMany(rule => rule.Attachments)
            .HasForeignKey(a => a.RuleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Attachment>()
            .HasOne(a => a.Location)
            .WithMany(location => location.Attachments)
            .HasForeignKey(a => a.LocationId)
            .OnDelete(DeleteBehavior.Cascade);

        // Deleting an actor must not orphan its resources or its encounter participants.
        modelBuilder.Entity<Resource>()
            .HasOne(r => r.Actor)
            .WithMany(a => a.Resources)
            .HasForeignKey(r => r.ActorId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EncounterParticipant>()
            .HasOne(p => p.Actor)
            .WithMany()
            .HasForeignKey(p => p.ActorId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EncounterParticipant>()
            .HasOne(p => p.Encounter)
            .WithMany(e => e.Participants)
            .HasForeignKey(p => p.EncounterId)
            .OnDelete(DeleteBehavior.Cascade);

        // Campaign is the aggregate root: deleting it cascades to everything it owns.
        modelBuilder.Entity<Actor>()
            .HasOne(a => a.Campaign)
            .WithMany(c => c.Actors)
            .HasForeignKey(a => a.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Location>()
            .HasOne(l => l.Campaign)
            .WithMany(c => c.Locations)
            .HasForeignKey(l => l.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RuleCategory>()
            .HasOne(rc => rc.Campaign)
            .WithMany(c => c.RuleCategory)
            .HasForeignKey(rc => rc.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Counter>()
            .HasOne(c => c.Campaign)
            .WithMany(c => c.Counters)
            .HasForeignKey(c => c.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Session>()
            .HasOne(s => s.Campaign)
            .WithMany(c => c.Sessions)
            .HasForeignKey(s => s.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<NoteCategory>()
            .HasOne(nc => nc.Campaign)
            .WithMany()
            .HasForeignKey(nc => nc.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        // Notes belong to the campaign aggregate even though the FK is optional.
        modelBuilder.Entity<Note>()
            .HasOne(n => n.Campaign)
            .WithMany(c => c.Notes)
            .HasForeignKey(n => n.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        // A note outlives the location it references; detach rather than delete.
        modelBuilder.Entity<Note>()
            .HasOne(n => n.Location)
            .WithMany()
            .HasForeignKey(n => n.LocationId)
            .OnDelete(DeleteBehavior.SetNull);

        // Deleting a game system or the current map location detaches it from campaigns
        // instead of tearing the campaign down.
        modelBuilder.Entity<Campaign>()
            .HasOne(c => c.GameSystem)
            .WithMany(g => g.Campaigns)
            .HasForeignKey(c => c.GameSystemId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Rule>()
            .HasOne(r => r.Category)
            .WithMany(rc => rc.Rules)
            .HasForeignKey(r => r.RuleCategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Encounter>()
            .HasOne(e => e.Session)
            .WithMany(s => s.Encounters)
            .HasForeignKey(e => e.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Note>()
            .HasOne(n => n.NoteCategory)
            .WithMany(c => c.Notes)
            .HasForeignKey(n => n.NoteCategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        // A note outlives the session it was prepared for; detach rather than delete.
        modelBuilder.Entity<Note>()
            .HasOne(n => n.Session)
            .WithMany(s => s.Notes)
            .HasForeignKey(n => n.SessionId)
            .OnDelete(DeleteBehavior.SetNull);
    }

    private static Dictionary<string, object> Deserialize(string json) =>
        string.IsNullOrWhiteSpace(json)
            ? new Dictionary<string, object>()
            : JsonSerializer.Deserialize<Dictionary<string, object>>(json, JsonOptions)
                ?? new Dictionary<string, object>();

    private static Dictionary<Guid, int> DeserializeIntMap(string json) =>
        TryDeserialize<Dictionary<Guid, int>>(json) ?? new Dictionary<Guid, int>();

    private static List<TemplateResource> DeserializeTemplateResources(string json) =>
        TryDeserialize<List<TemplateResource>>(json) ?? new List<TemplateResource>();

    private static List<Guid> DeserializeGuidList(string json) =>
        TryDeserialize<List<Guid>>(json) ?? new List<Guid>();

    private static List<string> DeserializeStringList(string json) =>
        TryDeserialize<List<string>>(json) ?? new List<string>();
    /// <summary>
    /// Deserialises a JSON column value, returning <c>null</c> for empty or malformed data so
    /// legacy rows (for example a migration default of "") never fault a read.
    /// </summary>
    private static T? TryDeserialize<T>(string json) where T : class
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            return JsonSerializer.Deserialize<T>(json, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
