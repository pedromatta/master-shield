using Microsoft.AspNetCore.Identity;

namespace Daedala.Models;

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

    /// <summary>Secondary/highlight gold colour.</summary>
    public string? ThemeSecondary { get; set; }

    /// <summary>Danger colour (rust by default).</summary>
    public string? ThemeDanger { get; set; }

    /// <summary>Success colour (moss by default).</summary>
    public string? ThemeSuccess { get; set; }

    /// <summary>Base application backdrop background color.</summary>
    public string? ThemeSurfaceBase { get; set; }

    /// <summary>Windows and cards background color.</summary>
    public string? ThemeSurfacePanel { get; set; }

    /// <summary>Headers and toolbar background color.</summary>
    public string? ThemeSurfaceRaised { get; set; }

    /// <summary>Input fields and wells background color.</summary>
    public string? ThemeSurfaceInset { get; set; }

    /// <summary>Primary body text color.</summary>
    public string? ThemeTextMain { get; set; }

    /// <summary>Secondary / muted text color.</summary>
    public string? ThemeTextMuted { get; set; }

    /// <summary>Border color for panels and controls.</summary>
    public string? ThemeBorderColor { get; set; }

    /// <summary>Body font family stack.</summary>
    public string? ThemeFontBody { get; set; }

    /// <summary>Display/heading font family stack.</summary>
    public string? ThemeFontDisplay { get; set; }

    /// <summary>Uploaded background image URI (under wwwroot).</summary>
    public string? ThemeBackgroundUri { get; set; }

    /// <summary>Background image opacity (0 to 1).</summary>
    public string? ThemeBackgroundOpacity { get; set; }

    /// <summary>Background image blur filter in pixels (e.g. 0px, 5px).</summary>
    public string? ThemeBackgroundBlur { get; set; }

    /// <summary>Background image size fit mode (cover, contain, auto, stretch, tile).</summary>
    public string? ThemeBackgroundFit { get; set; }

    /// <summary>Background image position (center, top, bottom, left, right).</summary>
    public string? ThemeBackgroundPosition { get; set; }

    /// <summary>Background image repeat (no-repeat, repeat, repeat-x, repeat-y).</summary>
    public string? ThemeBackgroundRepeat { get; set; }

    /// <summary>Background image attachment (fixed, scroll).</summary>
    public string? ThemeBackgroundAttachment { get; set; }

    /// <summary>Window and dialog opacity (0 to 1).</summary>
    public string? ThemeWindowOpacity { get; set; }

    /// <summary>Top header, bottom toolbar, and sidebar chrome opacity (0 to 1).</summary>
    public string? ThemeChromeOpacity { get; set; }

    public ICollection<Campaign> Campaigns { get; set; } = new List<Campaign>();
}
