using System.Security.Claims;
using Daedala.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Daedala.Filters;

/// <summary>
/// Guards every route whose URL contains a <c>campaignId</c> route value: the campaign must
/// belong to the signed-in user. Registered globally, so a new campaign-scoped controller is
/// protected by default rather than by remembering to add a check.
///
/// Endpoints that are deliberately anonymous (the public battle-map URLs a virtual tabletop
/// points at) opt out with <see cref="AllowAnonymousCampaignAttribute"/>.
/// </summary>
public class CampaignOwnershipFilter : IAsyncActionFilter
{
    private readonly ICampaignService _campaigns;

    public CampaignOwnershipFilter(ICampaignService campaigns)
    {
        _campaigns = campaigns;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // Anonymous endpoints (e.g. the stable map) carry the campaign id but no session.
        var isAnonymous = context.ActionDescriptor.EndpointMetadata
            .OfType<AllowAnonymousCampaignAttribute>()
            .Any();

        if (!isAnonymous)
        {
            if (!TryGetCampaignId(context, out var campaignId))
            {
                // No campaign in the route: nothing to scope here.
                await next();
                return;
            }

            var userId = GetUserId(context.HttpContext.User);
            if (userId is null)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            if (!await _campaigns.IsOwnedByAsync(campaignId, userId.Value))
            {
                // Do not distinguish "missing" from "not yours".
                context.Result = new NotFoundResult();
                return;
            }
        }

        await next();
    }

    private static bool TryGetCampaignId(ActionExecutingContext context, out Guid campaignId)
    {
        campaignId = Guid.Empty;

        if (context.RouteData.Values.TryGetValue("campaignId", out var raw)
            && Guid.TryParse(raw?.ToString(), out campaignId))
        {
            return true;
        }

        // Some routes take the campaign id as a query parameter instead.
        if (context.ActionArguments.TryGetValue("campaignId", out var argument)
            && argument is Guid fromArgument)
        {
            campaignId = fromArgument;
            return true;
        }

        return false;
    }

    private static Guid? GetUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}

/// <summary>Marks an endpoint as exempt from <see cref="CampaignOwnershipFilter"/>.</summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class AllowAnonymousCampaignAttribute : Attribute;
