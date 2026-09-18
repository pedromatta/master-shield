using System.Text.Json.Serialization;

namespace Daedala.Models;

/// <summary>Groups notes into navigable sections inside the notes panel.</summary>
public class NoteCategory
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Uploaded image (stored under <c>wwwroot</c>) drawn on the category button.
    /// Preferred over <see cref="Icon"/> whenever set.
    /// </summary>
    public string IconUri { get; set; } = string.Empty;

    /// <summary>Fallback glyph used only when no <see cref="IconUri"/> has been uploaded.</summary>
    public string Icon { get; set; } = "📝";

    /// <summary>Icon id chosen from the RPG Awesome / Lucide catalogues.</summary>
    public string IconId { get; set; } = "";

    public int SortOrder { get; set; }

    [JsonIgnore]
    public Campaign Campaign { get; set; } = null!;

    public ICollection<Note> Notes { get; set; } = new List<Note>();
}
