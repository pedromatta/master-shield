using Microsoft.AspNetCore.Identity;

namespace MasterShield.Models;

/// <summary>
/// The application account, backed by ASP.NET Core Identity. Identity already supplies
/// <see cref="IdentityUser{TKey}.Id"/>, <see cref="IdentityUser{TKey}.UserName"/>,
/// <see cref="IdentityUser{TKey}.Email"/> and the password hash, so no custom credential
/// columns are declared here. Game-specific profile fields can be added freely.
/// </summary>
public class User : IdentityUser<Guid>
{
    /// <summary>Display name shown on the GM's account switcher.</summary>
    public string DisplayName { get; set; } = string.Empty;

    public ICollection<Campaign> Campaigns { get; set; } = new List<Campaign>();
}
