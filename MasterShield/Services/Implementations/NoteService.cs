using MasterShield.Data;
using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Services.Implementations;

public class NoteService : MasterShieldContextService, INoteService
{
    public NoteService(MasterShieldContext context) : base(context) { }

    public async Task<IEnumerable<Note>> GetByCampaignAsync(Guid campaignId) =>
        await Context.Notes
            .Include(n => n.Tags)
            .Include(n => n.Attachments)
            .Where(n => n.CampaignId == campaignId)
            .AsNoTracking()
            .ToListAsync();

    public async Task<Note?> GetByIdAsync(Guid id) =>
        await Context.Notes
            .Include(n => n.Tags)
            .Include(n => n.Attachments)
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == id);

    public async Task<Note> CreateAsync(Note note)
    {
        if (note.Id == Guid.Empty)
            note.Id = Guid.NewGuid();

        note.Tags = await ResolveTagsAsync(note.Tags.Select(t => t.Id), TagCategory.Note);

        Context.Notes.Add(note);
        await Context.SaveChangesAsync();
        return note;
    }

    public async Task<bool> UpdateAsync(Note note)
    {
        var existing = await Context.Notes
            .Include(n => n.Tags)
            .FirstOrDefaultAsync(n => n.Id == note.Id);

        if (existing is null)
            return false;

        existing.Title = note.Title;
        existing.Content = note.Content;
        existing.NoteCategoryId = note.NoteCategoryId;
        existing.SessionId = note.SessionId;
        existing.LocationId = note.LocationId;

        var tags = await ResolveTagsAsync(note.Tags.Select(t => t.Id), TagCategory.Note);
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
        var note = await Context.Notes.FirstOrDefaultAsync(n => n.Id == id);
        if (note is null)
            return false;

        Context.Notes.Remove(note);
        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetTagsAsync(Guid noteId, IEnumerable<Guid> tagIds)
    {
        var note = await Context.Notes
            .Include(n => n.Tags)
            .FirstOrDefaultAsync(n => n.Id == noteId);

        if (note is null)
            return false;

        var tags = await ResolveTagsAsync(tagIds, TagCategory.Note);
        note.Tags.Clear();
        foreach (var tag in tags)
        {
            note.Tags.Add(tag);
        }

        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<NoteCategory>> GetCategoriesAsync(Guid campaignId) =>
        await Context.NoteCategories
            .Where(c => c.CampaignId == campaignId)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .AsNoTracking()
            .ToListAsync();

    public async Task<NoteCategory?> GetCategoryByIdAsync(Guid id) =>
        await Context.NoteCategories.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);

    public async Task<NoteCategory> CreateCategoryAsync(NoteCategory category)
    {
        if (category.Id == Guid.Empty)
            category.Id = Guid.NewGuid();

        Context.NoteCategories.Add(category);
        await Context.SaveChangesAsync();
        return category;
    }

    public async Task<bool> UpdateCategoryAsync(NoteCategory category)
    {
        var existing = await Context.NoteCategories.FirstOrDefaultAsync(c => c.Id == category.Id);
        if (existing is null)
            return false;

        existing.Name = category.Name;
        existing.Icon = category.Icon;
        existing.IconId = category.IconId;
        existing.IconUri = category.IconUri;
        existing.SortOrder = category.SortOrder;

        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteCategoryAsync(Guid id)
    {
        var category = await Context.NoteCategories.FirstOrDefaultAsync(c => c.Id == id);
        if (category is null)
            return false;

        Context.NoteCategories.Remove(category);
        await Context.SaveChangesAsync();
        return true;
    }
}
