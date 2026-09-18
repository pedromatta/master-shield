using MasterShield.Models;

namespace MasterShield.Services.Interfaces;

/// <summary>Outcome of an account mutation, so the controller can map to an HTTP status.</summary>
public enum UserResultStatus { Success, Invalid, Conflict, NotFound }

public record UserResult(UserResultStatus Status, User? User, string? Error = null)
{
    public static UserResult Ok(User user) => new(UserResultStatus.Success, user);
    public static UserResult Invalid(string error) => new(UserResultStatus.Invalid, null, error);
    public static UserResult Conflict(string error) => new(UserResultStatus.Conflict, null, error);
    public static UserResult Missing() => new(UserResultStatus.NotFound, null);
}

/// <summary>
/// A partial theme update. A <c>null</c> field leaves the stored value untouched; an empty
/// string clears the override so the built-in default applies again.
/// </summary>
public record ThemePatch(
    string? Accent = null,
    string? Danger = null,
    string? Success = null,
    string? FontBody = null,
    string? FontDisplay = null,
    string? BackgroundUri = null);

public interface IUserService
{
    Task<IEnumerable<User>> GetAllAsync();
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByUsernameAsync(string username);

    /// <summary>Verifies a username/password pair. Returns <c>null</c> when they do not match.</summary>
    Task<User?> AuthenticateAsync(string username, string password);

    /// <summary>
    /// Creates a new account and immediately returns it, used by the public sign-up form.
    /// </summary>
    Task<UserResult> SignUpAsync(string username, string? email, string password, string? displayName);

    /// <summary>
    /// Issues a password-reset token for an account. There is no mail delivery in this local
    /// tool, so the token is returned to the caller, which shows it to the GM to hand over.
    /// Returns <c>null</c> when the account does not exist.
    /// </summary>
    Task<string?> CreatePasswordResetTokenAsync(string username);

    /// <summary>Completes a reset with the token issued by <see cref="CreatePasswordResetTokenAsync"/>.</summary>
    Task<UserResult> ResetPasswordAsync(string username, string token, string newPassword);

    /// <summary>
    /// Applies a partial theme update to an account. Only the supplied fields change, so the
    /// caller can patch one value at a time.
    /// </summary>
    Task<User?> UpdateThemeAsync(Guid id, ThemePatch theme);

    Task<UserResult> CreateAsync(string username, string? email, string password, string? displayName);

    /// <summary>Updates the non-credential profile fields of an existing account.</summary>
    Task<UserResult> UpdateAsync(Guid id, string? username, string? email, string? displayName);

    /// <summary>Replaces the account password through Identity's hasher.</summary>
    Task<UserResult> ChangePasswordAsync(Guid id, string currentPassword, string newPassword);

    Task<bool> DeleteAsync(Guid id);
}
