using MasterShield.Data;
using MasterShield.Models;
using MasterShield.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace MasterShield.Services.Implementations;

/// <summary>
/// Account management on top of ASP.NET Core Identity's <see cref="UserManager{TUser}"/>.
/// All password hashing, uniqueness checks and validation live in Identity; this service
/// only translates Identity's result codes into a status the controller can map.
/// </summary>
public class UserService : IUserService
{
    private readonly MasterShieldContext _context;
    private readonly UserManager<User> _userManager;

    public UserService(MasterShieldContext context, UserManager<User> userManager)
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
