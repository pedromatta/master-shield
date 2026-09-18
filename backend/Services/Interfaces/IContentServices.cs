using Daedala.Models;

namespace Daedala.Services.Interfaces;

public interface ILocationService
{
    Task<IEnumerable<Location>> GetByCampaignAsync(Guid campaignId);
    Task<Location?> GetByIdAsync(Guid id);
    Task<Location> CreateAsync(Location location);
    Task<bool> UpdateAsync(Location location);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> SetTagsAsync(Guid locationId, IEnumerable<Guid> tagIds);
}

public interface ICounterService
{
    Task<IEnumerable<Counter>> GetByCampaignAsync(Guid campaignId);
    Task<Counter?> GetByIdAsync(Guid id);
    Task<Counter> CreateAsync(Counter counter);
    Task<bool> UpdateAsync(Counter counter);
    Task<bool> DeleteAsync(Guid id);
}

public interface IRuleService
{
    Task<IEnumerable<RuleCategory>> GetCategoriesAsync(Guid campaignId);
    Task<RuleCategory?> GetCategoryByIdAsync(Guid id);
    Task<RuleCategory> CreateCategoryAsync(RuleCategory category);
    Task<bool> UpdateCategoryAsync(RuleCategory category);
    Task<bool> DeleteCategoryAsync(Guid id);

    Task<Rule?> GetRuleByIdAsync(Guid id);
    Task<Rule> CreateRuleAsync(Rule rule);
    Task<bool> UpdateRuleAsync(Rule rule);
    Task<bool> DeleteRuleAsync(Guid id);
}

public interface ITagService
{
    Task<IEnumerable<Tag>> GetByCampaignAsync(Guid campaignId, TagCategory? category = null);
    Task<Tag?> GetByIdAsync(Guid id);
    Task<Tag> CreateAsync(Tag tag);
    Task<bool> UpdateAsync(Tag tag);
    Task<bool> DeleteAsync(Guid id);
}
