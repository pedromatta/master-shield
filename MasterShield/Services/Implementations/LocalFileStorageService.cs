using MasterShield.Services.Interfaces;

namespace MasterShield.Services.Implementations;

/// <summary>
/// Local-disk implementation that writes uploads beneath the web root. Paths are
/// normalised so a malicious <c>fileName</c> can never escape the uploads directory.
/// </summary>
public class LocalFileStorageService : IFileStorageService
{
    private const long MaxFileSizeBytes = 25 * 1024 * 1024; // 25 MB

    private static readonly HashSet<string> ImageExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg" };

    private static readonly Dictionary<string, string> ContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".png"] = "image/png",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".gif"] = "image/gif",
        [".webp"] = "image/webp",
        [".bmp"] = "image/bmp",
        [".svg"] = "image/svg+xml",
    };

    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<LocalFileStorageService> _logger;

    public LocalFileStorageService(
        IWebHostEnvironment environment,
        ILogger<LocalFileStorageService> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    public async Task<string> SaveAsync(
        IFormFile file, string scope, CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
            throw new ArgumentException("The uploaded file is empty.", nameof(file));

        if (file.Length > MaxFileSizeBytes)
            throw new ArgumentException("The uploaded file exceeds the 25 MB limit.", nameof(file));

        var normalizedScope = NormalizeScope(scope);
        var extension = Path.GetExtension(file.FileName);
        extension = string.IsNullOrWhiteSpace(extension) ? ".bin" : extension.ToLowerInvariant();

        // An image scope must actually receive an image; everything else may be any file type.
        if (IsImageScope(normalizedScope) && !ImageExtensions.Contains(extension))
            throw new ArgumentException(
                $"'{extension}' is not a supported image format.", nameof(file));

        var directory = Path.Combine(WebRootPath(), "uploads", normalizedScope);
        Directory.CreateDirectory(directory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var absolutePath = Path.Combine(directory, fileName);

        await using (var stream = new FileStream(absolutePath, FileMode.CreateNew))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return $"/uploads/{normalizedScope}/{fileName}";
    }

    public void Delete(string? relativeUri)
    {
        var absolute = ResolveExisting(relativeUri);
        if (absolute is null)
            return;

        try
        {
            File.Delete(absolute);
        }
        catch (IOException ex)
        {
            _logger.LogWarning(ex, "Could not delete stored file {Uri}.", relativeUri);
        }
    }

    public (Stream Stream, string ContentType)? OpenRead(string? relativeUri)
    {
        var absolute = ResolveExisting(relativeUri);
        if (absolute is null)
            return null;

        var contentType = ContentTypes.TryGetValue(Path.GetExtension(absolute), out var known)
            ? known
            : "application/octet-stream";

        var stream = new FileStream(
            absolute, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 64 * 1024,
            FileOptions.Asynchronous | FileOptions.SequentialScan);

        return (stream, contentType);
    }

    /// <summary>
    /// Maps an <c>/uploads/..</c> URI to an absolute path, refusing any value that escapes
    /// the uploads root. Returns <c>null</c> for non-upload URIs or missing files.
    /// </summary>
    private string? ResolveExisting(string? relativeUri)
    {
        if (string.IsNullOrWhiteSpace(relativeUri) || !relativeUri.StartsWith("/uploads/", StringComparison.Ordinal))
            return null;

        var relative = relativeUri["/uploads/".Length..].Replace('/', Path.DirectorySeparatorChar);
        var root = Path.GetFullPath(Path.Combine(WebRootPath(), "uploads"));
        var absolute = Path.GetFullPath(Path.Combine(root, relative));

        // Refuse anything that resolved outside the uploads root.
        if (!absolute.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            return null;

        return File.Exists(absolute) ? absolute : null;
    }

    private string WebRootPath()
    {
        var root = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(root))
        {
            root = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        Directory.CreateDirectory(root);
        return root;
    }

    private static string NormalizeScope(string scope)
    {
        var value = (scope ?? string.Empty).Trim().ToLowerInvariant();
        if (!IFileStorageService.AllowedScopes.Contains(value))
            throw new ArgumentException($"'{scope}' is not a valid upload scope.", nameof(scope));

        return value;
    }

    private static bool IsImageScope(string scope) =>
        scope is "actors" or "locations" or "rule-categories" or "note-categories" or "system-entities";
}
