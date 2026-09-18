using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace Daedala.Services.Implementations;

/// <summary>
/// Normalises battle-map images for the virtual tabletop. The stable map endpoint always
/// serves a 22:13 canvas: images that already match are returned untouched, anything else is
/// centred and letterboxed onto a black background so the projection never stretches.
/// </summary>
public static class MapImageNormalizer
{
    /// <summary>Target aspect ratio, 22:13.</summary>
    public const int RatioWidth = 22;
    public const int RatioHeight = 13;

    /// <summary>
    /// Returns the image re-encoded to a 22:13 canvas. When the source already matches the
    /// ratio it is returned as-is (no needless re-encode). Non-image data is passed through
    /// untouched so a corrupt upload still surfaces rather than 500-ing.
    /// </summary>
    public static byte[] FitToMapRatio(byte[] source, out string contentType, out bool transformed)
    {
        contentType = "image/png";
        transformed = false;

        if (source.Length == 0)
            return source;

        try
        {
            using var image = Image.Load<Rgba32>(source);

            var targetRatio = (double)RatioWidth / RatioHeight;
            var sourceRatio = (double)image.Width / image.Height;

            // Already within a hair of the target ratio: leave the bytes alone.
            if (Math.Abs(sourceRatio - targetRatio) < 0.001)
                return source;

            // Build the canvas from exact multiples of 22:13 so the served image is exactly
            // the target ratio regardless of the source (e.g. 220x130, 440x260). Scale the
            // base unit up until the canvas covers the source on its constrained axis, then
            // centre the image on black.
            var covering = sourceRatio > targetRatio
                ? (double)image.Width / RatioWidth
                : (double)image.Height / RatioHeight;

            // Round up to a whole number of base units so the canvas never clips the source.
            var units = Math.Max(1, (int)Math.Ceiling(covering));
            var canvasWidth = RatioWidth * units;
            var canvasHeight = RatioHeight * units;

            using var canvas = new Image<Rgba32>(canvasWidth, canvasHeight, new Rgba32(0, 0, 0, 255));

            var x = (canvasWidth - image.Width) / 2;
            var y = (canvasHeight - image.Height) / 2;
            canvas.Mutate(ctx => ctx.DrawImage(image, new Point(x, y), 1f));

            using var output = new MemoryStream();
            canvas.SaveAsPng(output);
            transformed = true;
            return output.ToArray();
        }
        catch (Exception)
        {
            // Not a decodable image (or an unsupported format): relay the original bytes.
            return source;
        }
    }
}
