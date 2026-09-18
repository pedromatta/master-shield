using System.Security.Claims;
using Daedala.Filters;
using Daedala.Models;
using Daedala.Services.Implementations;
using Daedala.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Daedala.Controllers;

[ApiController]
[Route("api/campaigns")]
public class CampaignsController : ControllerBase
{
    private readonly ICampaignService _campaignService;
    private readonly ILocationService _locationService;
    private readonly IFileStorageService _storage;
    private readonly IHttpClientFactory _httpClientFactory;

    public CampaignsController(
        ICampaignService campaignService,
        ILocationService locationService,
        IFileStorageService storage,
        IHttpClientFactory httpClientFactory)
    {
        _campaignService = campaignService;
        _locationService = locationService;
        _storage = storage;
        _httpClientFactory = httpClientFactory;
    }

    /// <summary>The signed-in GM's campaigns only.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Campaign>>> GetAll()
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        return Ok(await _campaignService.GetByUserAsync(userId.Value));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Campaign>> GetById(Guid id)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var campaign = await _campaignService.GetByIdAsync(id, userId.Value);
        return campaign is null ? NotFound() : Ok(campaign);
    }

    [HttpPost]
    public async Task<ActionResult<Campaign>> Create([FromBody] Campaign campaign)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(campaign.Name))
            return BadRequest("Name is required.");

        // Ownership always comes from the session, never from the request body.
        campaign.UserId = userId.Value;

        var created = await _campaignService.CreateAsync(campaign);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Campaign campaign)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        if (id != campaign.Id)
            return BadRequest("Route id does not match payload id.");

        return await _campaignService.UpdateAsync(campaign, userId.Value) ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        return await _campaignService.DeleteAsync(id, userId.Value) ? NoContent() : NotFound();
    }

    /// <summary>Points the campaign's stable map URI at a location, or clears it.</summary>
    [HttpPut("{id:guid}/current-map")]
    public async Task<IActionResult> SetCurrentMap(Guid id, [FromQuery] Guid? locationId)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var updated = await _campaignService.SetCurrentMapAsync(id, locationId, userId.Value);
        return updated ? NoContent() : NotFound();
    }

    /// <summary>The signed-in user's id, or null when the request is anonymous.</summary>
    private Guid? CurrentUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    /// <summary>
    /// The stable map endpoint a virtual tabletop can point at once and keep forever.
    /// Changing the campaign's current location changes the bytes this URL returns, so the
    /// tabletop never needs to be reconfigured between scenes. The image is streamed
    /// directly rather than redirected, because many VTT clients and image loaders do not
    /// follow redirects reliably.
    /// </summary>
    [HttpGet("{id:guid}/map")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [AllowAnonymousCampaign]
    public Task<IActionResult> GetCurrentMap(Guid id) => StreamCurrentMapAsync(id);

    /// <summary>
    /// Alias of <see cref="GetCurrentMap"/> kept for clients already pointing at it. Streams
    /// the current map image with no-cache headers instead of redirecting.
    /// </summary>
    [HttpGet("{id:guid}/map/image")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [AllowAnonymousCampaign]
    public Task<IActionResult> GetCurrentMapImage(Guid id) => StreamCurrentMapAsync(id);

    private async Task<IActionResult> StreamCurrentMapAsync(Guid id)
    {
        var campaign = await _campaignService.GetForMapAsync(id);
        if (campaign is null)
            return NotFound();

        if (campaign.CurrentMapLocationId is null)
            return NotFound("No map is set for this campaign.");

        var location = await _locationService.GetByIdAsync(campaign.CurrentMapLocationId.Value);
        if (location is null || string.IsNullOrWhiteSpace(location.ImageUri))
            return NotFound("The current map location has no image.");

        var imageUri = location.ImageUri;

        // Locally stored uploads are read from disk, then normalised to the map aspect ratio.
        var local = _storage.OpenRead(imageUri);
        if (local is { } file)
        {
            await using (file.Stream)
            {
                using var buffer = new MemoryStream();
                await file.Stream.CopyToAsync(buffer);
                return MapImage(buffer.ToArray());
            }
        }

        // Remote hosts (image sharing / VTT asset servers): fetch server-side and relay the
        // bytes so the caller always receives the image itself, never a redirect.
        if (Uri.TryCreate(imageUri, UriKind.Absolute, out var remote) &&
            (remote.Scheme == Uri.UriSchemeHttp || remote.Scheme == Uri.UriSchemeHttps))
        {
            return await RelayRemoteImageAsync(remote);
        }

        return NotFound("The current map location has no usable image.");
    }

    private async Task<IActionResult> RelayRemoteImageAsync(Uri remote)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("map-image");
            using var response = await client.GetAsync(remote, HttpCompletionOption.ResponseHeadersRead);

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, "The remote map image could not be retrieved.");

            await using var upstream = await response.Content.ReadAsStreamAsync();

            // Buffer the relayed image so the upstream connection can be released promptly.
            var buffer = new MemoryStream();
            await upstream.CopyToAsync(buffer);

            return MapImage(buffer.ToArray());
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return StatusCode(StatusCodes.Status502BadGateway, "The remote map image could not be retrieved.");
        }
    }

    /// <summary>
    /// Serves map bytes on a 22:13 canvas, letterboxing with black when the source does not
    /// match that ratio so a virtual tabletop never stretches the image.
    /// </summary>
    private FileContentResult MapImage(byte[] bytes)
    {
        var fitted = MapImageNormalizer.FitToMapRatio(bytes, out var contentType, out _);
        return File(fitted, contentType);
    }
}
