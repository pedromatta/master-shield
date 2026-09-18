using Daedala.Data;
using Daedala.Models;
using Daedala.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Daedala.Services.Implementations;

/// <summary>
/// Account management on top of ASP.NET Core Identity's <see cref="UserManager{TUser}"/>.
/// All password hashing, uniqueness checks and validation live in Identity; this service
/// only translates Identity's result codes into a status the controller can map.
/// </summary>
public class UserService : IUserService
{
    private readonly DaedalaContext _context;
    private readonly UserManager<User> _userManager;

    public UserService(DaedalaContext context, UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<IEnumerable<User>> GetAllAsync() =>
        await _context.Users
            .AsNoTracking()
            .OrderBy(u => u.UserName)
            .ToListAsync();

    public async Task<User?> GetByIdAsync(Guid id) =>
        await _userManager.FindByIdAsync(id.ToString());

    public async Task<User?> GetByUsernameAsync(string username) =>
        await _userManager.FindByNameAsync(username);

    public async Task<User?> AuthenticateAsync(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            return null;

        var user = await _userManager.FindByNameAsync(username.Trim());
        if (user is null)
            return null;

        return await _userManager.CheckPasswordAsync(user, password) ? user : null;
    }

    /// <summary>Public sign-up: creates an account with the same validation as admin creation.</summary>
    public Task<UserResult> SignUpAsync(
        string username, string? email, string password, string? displayName) =>
        CreateAsync(username, email, password, displayName);

    public async Task<string?> CreatePasswordResetTokenAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
            return null;

        var user = await _userManager.FindByNameAsync(username.Trim());
        if (user is null)
            return null;

        return await _userManager.GeneratePasswordResetTokenAsync(user);
    }

    public async Task<string?> GetResetEmailAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
            return null;

        var user = await _userManager.FindByNameAsync(username.Trim());
        // No address on file means no way to deliver the link; treat it like a miss so the
        // caller never learns whether the username exists.
        return string.IsNullOrWhiteSpace(user?.Email) ? null : user!.Email;
    }

    public async Task<UserResult> ResetPasswordAsync(string username, string token, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(newPassword))
            return UserResult.Invalid("The new password is required.");

        var user = await _userManager.FindByNameAsync(username?.Trim() ?? string.Empty);
        if (user is null)
            return UserResult.Invalid("That reset request is not valid.");

        var result = await _userManager.ResetPasswordAsync(user, token, newPassword);
        return result.Succeeded
            ? UserResult.Ok(user)
            : UserResult.Invalid(string.Join(" ", result.Errors.Select(e => e.Description)));
    }

    public async Task<User?> UpdateThemeAsync(Guid id, ThemePatch theme)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null)
            return null;

        // Null fields are "no change"; empty strings clear the override.
        if (theme.Accent is not null) user.ThemeAccent = Nullify(theme.Accent);
        if (theme.Secondary is not null) user.ThemeSecondary = Nullify(theme.Secondary);
        if (theme.Danger is not null) user.ThemeDanger = Nullify(theme.Danger);
        if (theme.Success is not null) user.ThemeSuccess = Nullify(theme.Success);
        if (theme.SurfaceBase is not null) user.ThemeSurfaceBase = Nullify(theme.SurfaceBase);
        if (theme.SurfacePanel is not null) user.ThemeSurfacePanel = Nullify(theme.SurfacePanel);
        if (theme.SurfaceRaised is not null) user.ThemeSurfaceRaised = Nullify(theme.SurfaceRaised);
        if (theme.SurfaceInset is not null) user.ThemeSurfaceInset = Nullify(theme.SurfaceInset);
        if (theme.TextMain is not null) user.ThemeTextMain = Nullify(theme.TextMain);
        if (theme.TextMuted is not null) user.ThemeTextMuted = Nullify(theme.TextMuted);
        if (theme.BorderColor is not null) user.ThemeBorderColor = Nullify(theme.BorderColor);
        if (theme.FontBody is not null) user.ThemeFontBody = Nullify(theme.FontBody);
        if (theme.FontDisplay is not null) user.ThemeFontDisplay = Nullify(theme.FontDisplay);
        if (theme.BackgroundUri is not null) user.ThemeBackgroundUri = Nullify(theme.BackgroundUri);
        if (theme.BackgroundOpacity is not null) user.ThemeBackgroundOpacity = Nullify(theme.BackgroundOpacity);
        if (theme.BackgroundBlur is not null) user.ThemeBackgroundBlur = Nullify(theme.BackgroundBlur);
        if (theme.BackgroundFit is not null) user.ThemeBackgroundFit = Nullify(theme.BackgroundFit);
        if (theme.BackgroundPosition is not null) user.ThemeBackgroundPosition = Nullify(theme.BackgroundPosition);
        if (theme.BackgroundRepeat is not null) user.ThemeBackgroundRepeat = Nullify(theme.BackgroundRepeat);
        if (theme.BackgroundAttachment is not null) user.ThemeBackgroundAttachment = Nullify(theme.BackgroundAttachment);
        if (theme.WindowOpacity is not null) user.ThemeWindowOpacity = Nullify(theme.WindowOpacity);
        if (theme.ChromeOpacity is not null) user.ThemeChromeOpacity = Nullify(theme.ChromeOpacity);

        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded ? user : null;
    }

    private static string? Nullify(string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public async Task<UserResult> CreateAsync(
        string username, string? email, string password, string? displayName)
    {
        if (string.IsNullOrWhiteSpace(username))
            return UserResult.Invalid("Username is required.");

        if (string.IsNullOrWhiteSpace(password))
            return UserResult.Invalid("Password is required.");

        var trimmed = username.Trim();
        if (await _userManager.FindByNameAsync(trimmed) is not null)
            return UserResult.Conflict($"A user named '{trimmed}' already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = trimmed,
            Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim(),
            DisplayName = string.IsNullOrWhiteSpace(displayName) ? trimmed : displayName.Trim()
        };

        var result = await _userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            var error = string.Join(" ", result.Errors.Select(e => e.Description));
            return UserResult.Invalid(error);
        }

        return UserResult.Ok(user);
    }

    public async Task<UserResult> UpdateAsync(
        Guid id, string? username, string? email, string? displayName)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null)
            return UserResult.Missing();

        if (!string.IsNullOrWhiteSpace(username))
        {
            var trimmed = username.Trim();
            if (!string.Equals(user.UserName, trimmed, StringComparison.OrdinalIgnoreCase))
            {
                if (await _userManager.FindByNameAsync(trimmed) is not null)
                    return UserResult.Conflict($"A user named '{trimmed}' already exists.");

                user.UserName = trimmed;
            }
        }

        if (email is not null)
            user.Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();

        if (displayName is not null)
            user.DisplayName = displayName.Trim();

        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded
            ? UserResult.Ok(user)
            : UserResult.Invalid(string.Join(" ", result.Errors.Select(e => e.Description)));
    }

    public async Task<UserResult> ChangePasswordAsync(
        Guid id, string currentPassword, string newPassword)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null)
            return UserResult.Missing();

        if (string.IsNullOrWhiteSpace(newPassword))
            return UserResult.Invalid("The new password is required.");

        var result = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);
        return result.Succeeded
            ? UserResult.Ok(user)
            : UserResult.Invalid(string.Join(" ", result.Errors.Select(e => e.Description)));
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null)
            return false;

        var result = await _userManager.DeleteAsync(user);
        return result.Succeeded;
    }
}
