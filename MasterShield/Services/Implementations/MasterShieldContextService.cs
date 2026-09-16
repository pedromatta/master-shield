using MasterShield.Data;
using MasterShield.Models;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Services.Implementations;

/// <summary>
/// Shared context access and tag resolution for the content services. Keeps the CRUD
/// services from re-implementing the same include/attach dance.
/// </summary>
public abstract class MasterShieldContextService
{
    protected MasterShieldContextService(MasterShieldContext context)
    {
        Context = context;
    }

    protected MasterShieldContext Context { get; }

    protected async Task<List<Tag>> ResolveTagsAsync(IEnumerable<Guid> tagIds, TagCategory category)
    {
        var ids = tagIds?.Distinct().ToList() ?? [];
        if (ids.Count == 0)
            return [];

        // Only tags belonging to this entity family may be attached; a shared tag table
        // with a category discriminator keeps the four grids independent.
        return await Context.Tags
            .Where(t => ids.Contains(t.Id) && t.Category == category)
            .ToListAsync();
    }
}
