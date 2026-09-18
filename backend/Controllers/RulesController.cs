using Daedala.Models;
using Daedala.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Daedala.Controllers;

[ApiController]
[Route("api/rules")]
public class RulesController : ControllerBase
{
    private readonly IRuleService _ruleService;
    private readonly IFileStorageService _storage;

    public RulesController(IRuleService ruleService, IFileStorageService storage)
    {
        _ruleService = ruleService;
        _storage = storage;
    }

    [HttpGet("categories/campaign/{campaignId:guid}")]
    public async Task<ActionResult<IEnumerable<RuleCategory>>> GetCategories(Guid campaignId) =>
        Ok(await _ruleService.GetCategoriesAsync(campaignId));

    [HttpGet("categories/{id:guid}")]
    public async Task<ActionResult<RuleCategory>> GetCategoryById(Guid id)
    {
        var category = await _ruleService.GetCategoryByIdAsync(id);
        return category is null ? NotFound() : Ok(category);
    }

    [HttpPost("categories")]
    public async Task<ActionResult<RuleCategory>> CreateCategory([FromBody] RuleCategory category)
    {
        if (string.IsNullOrWhiteSpace(category.Name) || category.CampaignId == Guid.Empty)
            return BadRequest("Name and CampaignId are required.");

        var created = await _ruleService.CreateCategoryAsync(category);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPut("categories/{id:guid}")]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] RuleCategory category)
    {
        if (id != category.Id)
            return BadRequest("Route id does not match payload id.");

        return await _ruleService.UpdateCategoryAsync(category) ? NoContent() : NotFound();
    }

    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id) =>
        await _ruleService.DeleteCategoryAsync(id) ? NoContent() : NotFound();

    /// <summary>Uploads the category's icon image and stores its URI.</summary>
    [HttpPost("categories/{id:guid}/icon")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<string>> UploadCategoryIcon(
        Guid id, [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null)
            return BadRequest("A file is required.");

        var category = await _ruleService.GetCategoryByIdAsync(id);
        if (category is null)
            return NotFound();

        string uri;
        try
        {
            uri = await _storage.SaveAsync(file, "rule-categories", cancellationToken);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }

        _storage.Delete(category.IconUri);
        category.IconUri = uri;
        await _ruleService.UpdateCategoryAsync(category);
        return Ok(new { iconUri = uri });
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Rule>> GetRuleById(Guid id)
    {
        var rule = await _ruleService.GetRuleByIdAsync(id);
        return rule is null ? NotFound() : Ok(rule);
    }

    [HttpPost]
    public async Task<ActionResult<Rule>> CreateRule([FromBody] Rule rule)
    {
        if (string.IsNullOrWhiteSpace(rule.Title) || rule.RuleCategoryId == Guid.Empty)
            return BadRequest("Title and RuleCategoryId are required.");

        var created = await _ruleService.CreateRuleAsync(rule);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateRule(Guid id, [FromBody] Rule rule)
    {
        if (id != rule.Id)
            return BadRequest("Route id does not match payload id.");

        return await _ruleService.UpdateRuleAsync(rule) ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteRule(Guid id) =>
        await _ruleService.DeleteRuleAsync(id) ? NoContent() : NotFound();
}
