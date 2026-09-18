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

    // ---- Personal theme -----------------------------------------------------
    // The GM can re-skin the shield for themselves. Each value is a CSS-compatible colour or
    // font stack; empty means "use the built-in default".

    /// <summary>Primary accent colour (bronze by default).</summary>
    public string? ThemeAccent { get; set; }

    /// <summary>Danger colour (rust by default).</summary>
    public string? ThemeDanger { get; set; }

    /// <summary>Success colour (moss by default).</summary>
    public string? ThemeSuccess { get; set; }

    /// <summary>Body font family stack.</summary>
    public string? ThemeFontBody { get; set; }

    /// <summary>Display/heading font family stack.</summary>
    public string? ThemeFontDisplay { get; set; }

    /// <summary>Uploaded background image URI (under wwwroot).</summary>
    public string? ThemeBackgroundUri { get; set; }

    public ICollection<Campaign> Campaigns { get; set; } = new List<Campaign>();
}
