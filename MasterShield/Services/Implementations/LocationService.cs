using MasterShield.Data;
using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Services.Implementations;

public class LocationService : MasterShieldContextService, ILocationService
{
    public LocationService(MasterShieldContext context) : base(context) { }

    public async Task<IEnumerable<Location>> GetByCampaignAsync(Guid campaignId) =>
        await Context.Locations
            .Include(l => l.Tags)
            .Include(l => l.Attachments)
            .Where(l => l.CampaignId == campaignId)
            .OrderBy(l => l.Name)
            .AsNoTracking()
            .ToListAsync();

    public async Task<Location?> GetByIdAsync(Guid id) =>
        await Context.Locations
            .Include(l => l.Tags)
            .Include(l => l.Attachments)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id);

    public async Task<Location> CreateAsync(Location location)
    {
        if (location.Id == Guid.Empty)
            location.Id = Guid.NewGuid();

        location.Tags = await ResolveTagsAsync(location.Tags.Select(t => t.Id), TagCategory.Location);

        Context.Locations.Add(location);
        await Context.SaveChangesAsync();
        return location;
    }

    public async Task<bool> UpdateAsync(Location location)
    {
        var existing = await Context.Locations
            .Include(l => l.Tags)
            .FirstOrDefaultAsync(l => l.Id == location.Id);

        if (existing is null)
            return false;

        existing.Name = location.Name;
        existing.Description = location.Description;
        existing.ImageUri = location.ImageUri;

        var tags = await ResolveTagsAsync(location.Tags.Select(t => t.Id), TagCategory.Location);
        existing.Tags.Clear();
        foreach (var tag in tags)
        {
            existing.Tags.Add(tag);
        }

        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var location = await Context.Locations.FirstOrDefaultAsync(l => l.Id == id);
        if (location is null)
            return false;

        Context.Locations.Remove(location);
        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetTagsAsync(Guid locationId, IEnumerable<Guid> tagIds)
    {
        var location = await Context.Locations
            .Include(l => l.Tags)
            .FirstOrDefaultAsync(l => l.Id == locationId);

        if (location is null)
            return false;

        var tags = await ResolveTagsAsync(tagIds, TagCategory.Location);
        location.Tags.Clear();
        foreach (var tag in tags)
        {
            location.Tags.Add(tag);
        }

        await Context.SaveChangesAsync();
        return true;
    }
}

public class CounterService : MasterShieldContextService, ICounterService
{
    public CounterService(MasterShieldContext context) : base(context) { }

    public async Task<IEnumerable<Counter>> GetByCampaignAsync(Guid campaignId) =>
        await Context.Counters
            .Include(c => c.Tags)
            .Where(c => c.CampaignId == campaignId)
            .OrderBy(c => c.Name)
            .AsNoTracking()
            .ToListAsync();

    public async Task<Counter?> GetByIdAsync(Guid id) =>
        await Context.Counters
            .Include(c => c.Tags)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

    public async Task<Counter> CreateAsync(Counter counter)
    {
        if (counter.Id == Guid.Empty)
            counter.Id = Guid.NewGuid();

        if (counter.Boxes < 1)
            counter.Boxes = 1;

        counter.CurrentValue = Math.Clamp(counter.CurrentValue, 0, counter.Boxes);

        Context.Counters.Add(counter);
        await Context.SaveChangesAsync();
        return counter;
    }

    public async Task<bool> UpdateAsync(Counter counter)
    {
        var existing = await Context.Counters.FirstOrDefaultAsync(c => c.Id == counter.Id);
        if (existing is null)
            return false;

        existing.Name = counter.Name;
        existing.Boxes = counter.Boxes < 1 ? 1 : counter.Boxes;
        existing.CurrentValue = Math.Clamp(counter.CurrentValue, 0, existing.Boxes);
        existing.ColorHex = counter.ColorHex;

        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var counter = await Context.Counters.FirstOrDefaultAsync(c => c.Id == id);
        if (counter is null)
            return false;

        Context.Counters.Remove(counter);
        await Context.SaveChangesAsync();
        return true;
    }
}

public class TagService : MasterShieldContextService, ITagService
{
    public TagService(MasterShieldContext context) : base(context) { }

    public async Task<IEnumerable<Tag>> GetByCampaignAsync(Guid campaignId, TagCategory? category = null) =>
        await Context.Tags
            .Where(t => t.CampaignId == campaignId && (category == null || t.Category == category))
            .OrderBy(t => t.Name)
            .AsNoTracking()
            .ToListAsync();

    public async Task<Tag?> GetByIdAsync(Guid id) =>
        await Context.Tags.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);

    public async Task<Tag> CreateAsync(Tag tag)
    {
        if (tag.Id == Guid.Empty)
            tag.Id = Guid.NewGuid();

        Context.Tags.Add(tag);
        await Context.SaveChangesAsync();
        return tag;
    }

    public async Task<bool> UpdateAsync(Tag tag)
    {
        var existing = await Context.Tags.FirstOrDefaultAsync(t => t.Id == tag.Id);
        if (existing is null)
            return false;

        existing.Name = tag.Name;
        existing.ColorHex = tag.ColorHex;
        existing.Category = tag.Category;

        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var tag = await Context.Tags.FirstOrDefaultAsync(t => t.Id == id);
        if (tag is null)
            return false;

        Context.Tags.Remove(tag);
        await Context.SaveChangesAsync();
        return true;
    }
}
