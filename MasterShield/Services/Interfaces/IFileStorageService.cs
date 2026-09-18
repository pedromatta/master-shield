namespace MasterShield.Services.Interfaces;

/// <summary>
/// Persists user-supplied binary assets (portraits, battle maps, category icons,
/// attachments) on the server and returns the relative URI that is stored in the
/// database. The URI always points beneath <c>wwwroot</c> so it is served statically.
/// </summary>
public interface IFileStorageService
{
    /// <summary>Top-level folders an upload may be filed under.</summary>
    static readonly string[] AllowedScopes =
    [
        "actors", "locations", "rules", "notes", "rule-categories", "note-categories",
        "system-entities", "backgrounds"
    ];

    /// <summary>
    /// Stores <paramref name="file"/> under <c>wwwroot/uploads/{scope}</c> and returns the
    /// public relative URI (for example <c>/uploads/actors/&lt;guid&gt;.png</c>).
    /// </summary>
    /// <exception cref="ArgumentException">The scope or file is not acceptable.</exception>
    Task<string> SaveAsync(IFormFile file, string scope, CancellationToken cancellationToken = default);

    /// <summary>Deletes a previously stored file given its relative URI. Missing files are ignored.</summary>
    void Delete(string? relativeUri);

    /// <summary>
    /// Opens a stored file for reading by its relative URI, along with its detected content
    /// type. Returns <c>null</c> when the URI is not an <c>/uploads/</c> path or the file does
    /// not exist. Used to stream assets (for example the current battle map) instead of
    /// issuing an HTTP redirect, which many virtual tabletop clients handle poorly.
    /// </summary>
    (Stream Stream, string ContentType)? OpenRead(string? relativeUri);
}
