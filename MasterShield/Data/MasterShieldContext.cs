using Microsoft.EntityFrameworkCore;
using MasterShield.Models;

namespace MasterShield.Data;

public class MasterShieldContext : DbContext
{
    public MasterShieldContext(DbContextOptions<MasterShieldContext> options) { }

    public required DbSet<Actor> Actors { get; set; }
    public required DbSet<Attachment> Attachments { get; set; }
    public required DbSet<Campaign> Campaigns { get; set; }
    public required DbSet<Counter> Counters { get; set; }
    public required DbSet<Encounter> Encounters { get; set; }
    public required DbSet<EncounterParticipant> EncounterParticipants { get; set; }
    public required DbSet<Location> Locations { get; set; }
    public required DbSet<Note> Notes { get; set; }
    public required DbSet<Resource> Resources { get; set; }
    public required DbSet<Rule> Rules { get; set; }
    public required DbSet<RuleCategory> RuleCategories { get; set; }
    public required DbSet<Session> Sessions { get; set; }
    public required DbSet<Tag> Tags { get; set; }
    public required DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Actor>()
            .OwnsOne(a => a.SystemData, builder => {
                builder.ToJson();
            });
    }
}
