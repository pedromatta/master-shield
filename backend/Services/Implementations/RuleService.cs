using Daedala.Data;
using Daedala.Models;
using Daedala.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Daedala.Services.Implementations;

public class RuleService : DaedalaContextService, IRuleService
{
    private readonly IBlueprintService _blueprints;

    public RuleService(DaedalaContext context, IBlueprintService blueprints) : base(context)
    {
        _blueprints = blueprints;
    }

    public async Task<IEnumerable<RuleCategory>> GetCategoriesAsync(Guid campaignId) =>
        await Context.RuleCategories
            .Include(rc => rc.Rules)
                .ThenInclude(r => r.Tags)
            .Include(rc => rc.Rules)
                .ThenInclude(r => r.Attachments)
            .Where(rc => rc.CampaignId == campaignId)
            .OrderBy(rc => rc.SortOrder)
            .ThenBy(rc => rc.Name)
            .AsNoTracking()
            .ToListAsync();

    public async Task<RuleCategory?> GetCategoryByIdAsync(Guid id) =>
        await Context.RuleCategories
            .Include(rc => rc.Rules)
                .ThenInclude(r => r.Tags)
            .Include(rc => rc.Rules)
                .ThenInclude(r => r.Attachments)
            .AsNoTracking()
            .FirstOrDefaultAsync(rc => rc.Id == id);

    public async Task<RuleCategory> CreateCategoryAsync(RuleCategory category)
    {
        if (category.Id == Guid.Empty)
            category.Id = Guid.NewGuid();

        Context.RuleCategories.Add(category);
        await Context.SaveChangesAsync();
        return category;
    }

    public async Task<bool> UpdateCategoryAsync(RuleCategory category)
    {
        var existing = await Context.RuleCategories.FirstOrDefaultAsync(rc => rc.Id == category.Id);
        if (existing is null)
            return false;

        existing.Name = category.Name;
        existing.Icon = category.Icon;
        existing.IconId = category.IconId;
        existing.IconUri = category.IconUri;
        existing.SortOrder = category.SortOrder;
        existing.ShowInToolbar = category.ShowInToolbar;

        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteCategoryAsync(Guid id)
    {
        var category = await Context.RuleCategories
            .Include(rc => rc.Rules)
            .FirstOrDefaultAsync(rc => rc.Id == id);

        if (category is null)
            return false;

        Context.RuleCategories.Remove(category);
        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<Rule?> GetRuleByIdAsync(Guid id) =>
        await Context.Rules
            .Include(r => r.Tags)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);

    public async Task<Rule> CreateRuleAsync(Rule rule)
    {
        if (rule.Id == Guid.Empty)
            rule.Id = Guid.NewGuid();

        rule.Tags = await ResolveTagsAsync(rule.Tags.Select(t => t.Id), TagCategory.Rule);

        // The system's rule blueprint seeds game-specific attributes on every new rule.
        var campaignId = await Context.RuleCategories
            .Where(rc => rc.Id == rule.RuleCategoryId)
            .Select(rc => rc.CampaignId)
            .FirstOrDefaultAsync();

        if (campaignId != Guid.Empty)
            await _blueprints.ApplyRuleDefaultsAsync(rule, campaignId);

        Context.Rules.Add(rule);
        await Context.SaveChangesAsync();
        return rule;
    }

    public async Task<bool> UpdateRuleAsync(Rule rule)
    {
        var existing = await Context.Rules
            .Include(r => r.Tags)
            .FirstOrDefaultAsync(r => r.Id == rule.Id);

        if (existing is null)
            return false;

        existing.RuleCategoryId = rule.RuleCategoryId;
        existing.Title = rule.Title;
        existing.Content = rule.Content;
        existing.IconId = rule.IconId;
        existing.ImageUri = rule.ImageUri;
        existing.SystemData = rule.SystemData;

        var tags = await ResolveTagsAsync(rule.Tags.Select(t => t.Id), TagCategory.Rule);
        existing.Tags.Clear();
        foreach (var tag in tags)
        {
            existing.Tags.Add(tag);
        }

        await Context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteRuleAsync(Guid id)
    {
        var rule = await Context.Rules.FirstOrDefaultAsync(r => r.Id == id);
        if (rule is null)
            return false;

        Context.Rules.Remove(rule);
        await Context.SaveChangesAsync();
        return true;
    }
}
