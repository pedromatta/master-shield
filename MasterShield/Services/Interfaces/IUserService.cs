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

public interface IUserService
{
    Task<IEnumerable<User>> GetAllAsync();
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByUsernameAsync(string username);

    Task<UserResult> CreateAsync(string username, string? email, string password, string? displayName);

    /// <summary>Updates the non-credential profile fields of an existing account.</summary>
    Task<UserResult> UpdateAsync(Guid id, string? username, string? email, string? displayName);

    /// <summary>Replaces the account password through Identity's hasher.</summary>
    Task<UserResult> ChangePasswordAsync(Guid id, string currentPassword, string newPassword);

    Task<bool> DeleteAsync(Guid id);
}
