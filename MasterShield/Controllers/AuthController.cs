using System.Security.Claims;
using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MasterShield.Controllers;

/// <summary>
/// Cookie-based sign-in for the GM. A successful login issues an authentication cookie that
/// the SPA sends automatically (same origin); <c>/me</c> reports the current session and
/// <c>/logout</c> clears it.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IUserService _users;
    private readonly IEmailSender _email;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IUserService users,
        IEmailSender email,
        IConfiguration configuration,
        ILogger<AuthController> logger)
    {
        _users = users;
        _email = email;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>Signs an account in and issues the auth cookie.</summary>
    [HttpPost("login")]
    public async Task<ActionResult<AuthUser>> Login([FromBody] LoginRequest request)
    {
        var user = await _users.AuthenticateAsync(request.Username, request.Password);
        if (user is null)
            return Unauthorized("Invalid username or password.");

        await SignInAsync(user);
        return Ok(AuthUser.From(user));
    }

    /// <summary>Clears the auth cookie.</summary>
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    /// <summary>Registers a new account and signs it in.</summary>
    [HttpPost("signup")]
    public async Task<ActionResult<AuthUser>> SignUp([FromBody] SignUpRequest request)
    {
        var result = await _users.SignUpAsync(
            request.Username, request.Email, request.Password, request.DisplayName);

        if (result.Status != UserResultStatus.Success || result.User is null)
        {
            return result.Status switch
            {
                UserResultStatus.Conflict => Conflict(result.Error),
                _ => BadRequest(result.Error ?? "Could not create the account.")
            };
        }

        await SignInAsync(result.User);
        return Ok(AuthUser.From(result.User));
    }

    /// <summary>
    /// Starts a password reset. The reset link is emailed to the address on the account; the
    /// response never reveals whether the username exists and never contains the token.
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        // Always answer the same way so the endpoint cannot be used to probe usernames.
        var email = await _users.GetResetEmailAsync(request.Username);
        if (email is null)
            return Ok();

        var token = await _users.CreatePasswordResetTokenAsync(request.Username);
        if (token is null)
            return Ok();

        var link = BuildResetLink(request.Username.Trim(), token);
        var body =
            $"A password reset was requested for your Master Shield account.\n\n" +
            $"Open this link to choose a new password:\n{link}\n\n" +
            "If you did not request this, you can ignore this message.";

        try
        {
            await _email.SendAsync(email, "Master Shield password reset", body);
        }
        catch (Exception ex)
        {
            // Do not surface delivery problems to the caller; log them for the operator.
            _logger.LogError(ex, "Could not send the password reset email.");
        }

        return Ok();
    }

    /// <summary>Builds the absolute link the GM follows to set a new password.</summary>
    private string BuildResetLink(string username, string token)
    {
        var baseUrl = (_configuration["App:PublicUrl"] ?? "http://localhost:4200").TrimEnd('/');
        var query =
            $"?username={Uri.EscapeDataString(username)}&token={Uri.EscapeDataString(token)}";
        return $"{baseUrl}/reset-password{query}";
    }

    /// <summary>Completes a password reset with a previously issued token.</summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var result = await _users.ResetPasswordAsync(request.Username, request.Token, request.NewPassword);
        return result.Status == UserResultStatus.Success
            ? NoContent()
            : BadRequest(result.Error ?? "Could not reset the password.");
    }

    /// <summary>Issues the auth cookie for an account (shared by login and sign-up).</summary>
    private async Task SignInAsync(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.UserName ?? string.Empty),
            new("display_name", user.DisplayName ?? user.UserName ?? string.Empty)
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true });
    }

    /// <summary>Reports the signed-in account, or 401 when there is none.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<AuthUser>> Me()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id is null || !Guid.TryParse(id, out var userId))
            return Unauthorized();

        var user = await _users.GetByIdAsync(userId);
        return user is null ? Unauthorized() : Ok(AuthUser.From(user));
    }

    /// <summary>Saves the signed-in GM's personal theme.</summary>
    [HttpPut("theme")]
    public async Task<ActionResult<AuthUser>> UpdateTheme([FromBody] ThemeRequest request)
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id is null || !Guid.TryParse(id, out var userId))
            return Unauthorized();

        var updated = await _users.UpdateThemeAsync(userId, new ThemePatch(
            request.Accent, request.Danger, request.Success,
            request.FontBody, request.FontDisplay, request.BackgroundUri));
        return updated is null ? NotFound() : Ok(AuthUser.From(updated));
    }

    /// <summary>Uploads a background image for the signed-in GM's theme.</summary>
    [HttpPost("theme/background")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<AuthUser>> UploadBackground(
        [FromForm] IFormFile file,
        [FromServices] IFileStorageService storage,
        CancellationToken cancellationToken)
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id is null || !Guid.TryParse(id, out var userId))
            return Unauthorized();

        if (file is null)
            return BadRequest("A file is required.");

        string uri;
        try
        {
            uri = await storage.SaveAsync(file, "backgrounds", cancellationToken);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }

        var updated = await _users.UpdateThemeAsync(userId, new ThemePatch(
            BackgroundUri: uri));
        return updated is null ? NotFound() : Ok(AuthUser.From(updated));
    }

    public record LoginRequest(string Username, string Password);

    public record SignUpRequest(
        string Username,
        string Password,
        string? Email = null,
        string? DisplayName = null);

    public record ForgotPasswordRequest(string Username);

    public record ResetPasswordRequest(string Username, string Token, string NewPassword);

    /// <summary>Theme overrides; a null field leaves the current value untouched.</summary>
    public record ThemeRequest(
        string? Accent = null,
        string? Danger = null,
        string? Success = null,
        string? FontBody = null,
        string? FontDisplay = null,
        string? BackgroundUri = null);

    public record AuthUser(
        string Id,
        string Username,
        string DisplayName,
        string? ThemeAccent,
        string? ThemeDanger,
        string? ThemeSuccess,
        string? ThemeFontBody,
        string? ThemeFontDisplay,
        string? ThemeBackgroundUri)
    {
        public static AuthUser From(User user) => new(
            user.Id.ToString(),
            user.UserName ?? string.Empty,
            user.DisplayName ?? string.Empty,
            user.ThemeAccent,
            user.ThemeDanger,
            user.ThemeSuccess,
            user.ThemeFontBody,
            user.ThemeFontDisplay,
            user.ThemeBackgroundUri);
    }
}
