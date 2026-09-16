using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MasterShield.Controllers;

/// <summary>
/// Account management backed by ASP.NET Core Identity. There is no authentication
/// pipeline yet; this only lets the GM create, update and enumerate local accounts.
/// </summary>
[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserSummary>>> GetAll()
    {
        var users = await _userService.GetAllAsync();
        return Ok(users.Select(ToSummary));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserSummary>> GetById(Guid id)
    {
        var user = await _userService.GetByIdAsync(id);
        return user is null ? NotFound() : Ok(ToSummary(user));
    }

    [HttpPost]
    public async Task<ActionResult<UserSummary>> Create([FromBody] CreateUserRequest request)
    {
        var result = await _userService.CreateAsync(
            request.Username, request.Email, request.Password, request.DisplayName);

        return result.Status switch
        {
            UserResultStatus.Success =>
                CreatedAtAction(nameof(GetById), new { id = result.User!.Id }, ToSummary(result.User)),
            UserResultStatus.Conflict => Conflict(result.Error),
            _ => BadRequest(result.Error)
        };
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserSummary>> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        var result = await _userService.UpdateAsync(id, request.Username, request.Email, request.DisplayName);

        return result.Status switch
        {
            UserResultStatus.Success => Ok(ToSummary(result.User!)),
            UserResultStatus.NotFound => NotFound(),
            UserResultStatus.Conflict => Conflict(result.Error),
            _ => BadRequest(result.Error)
        };
    }

    [HttpPut("{id:guid}/password")]
    public async Task<IActionResult> ChangePassword(Guid id, [FromBody] ChangePasswordRequest request)
    {
        var result = await _userService.ChangePasswordAsync(id, request.CurrentPassword, request.NewPassword);

        return result.Status switch
        {
            UserResultStatus.Success => NoContent(),
            UserResultStatus.NotFound => NotFound(),
            _ => BadRequest(result.Error)
        };
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await _userService.DeleteAsync(id) ? NoContent() : NotFound();

    /// <summary>Projects a user without ever exposing the stored password hash.</summary>
    private static UserSummary ToSummary(User user) =>
        new(user.Id, user.UserName ?? string.Empty, user.Email ?? string.Empty, user.DisplayName);

    public record CreateUserRequest(
        string Username, string? Email, string Password, string? DisplayName);

    public record UpdateUserRequest(
        string? Username, string? Email, string? DisplayName);

    public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

    public record UserSummary(Guid Id, string Username, string Email, string DisplayName);
}
