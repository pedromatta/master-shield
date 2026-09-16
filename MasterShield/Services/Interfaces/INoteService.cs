using MasterShield.Models;

namespace MasterShield.Services.Interfaces;

public interface INoteService
{
    Task<IEnumerable<Note>> GetByCampaignAsync(Guid campaignId);
    Task<Note?> GetByIdAsync(Guid id);
    Task<Note> CreateAsync(Note note);
    Task<bool> UpdateAsync(Note note);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> SetTagsAsync(Guid noteId, IEnumerable<Guid> tagIds);

    Task<IEnumerable<NoteCategory>> GetCategoriesAsync(Guid campaignId);
    Task<NoteCategory?> GetCategoryByIdAsync(Guid id);
    Task<NoteCategory> CreateCategoryAsync(NoteCategory category);
    Task<bool> UpdateCategoryAsync(NoteCategory category);
    Task<bool> DeleteCategoryAsync(Guid id);
}
