using System.Text.Json;
using Daedala.Models;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Daedala.Data;

/// <summary>
/// Shared JSON value converters for the list-shaped columns on <see cref="SystemBlueprint"/>.
/// EF compares these collections through their serialised form, so mutating a list in place
/// still registers as a change.
/// </summary>
internal static class BlueprintJson
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static readonly ValueConverter<List<BlueprintResource>, string> ResourceList = new(
        value => JsonSerializer.Serialize(value, Options),
        json => Deserialize<List<BlueprintResource>>(json) ?? new());

    public static readonly ValueComparer<List<BlueprintResource>> ResourceComparer = new(
        (a, b) => JsonSerializer.Serialize(a, Options) == JsonSerializer.Serialize(b, Options),
        value => value == null ? 0 : JsonSerializer.Serialize(value, Options).GetHashCode(),
        value => Deserialize<List<BlueprintResource>>(JsonSerializer.Serialize(value, Options)) ?? new());

    public static readonly ValueConverter<List<BlueprintAttribute>, string> AttributeList = new(
        value => JsonSerializer.Serialize(value, Options),
        json => Deserialize<List<BlueprintAttribute>>(json) ?? new());

    public static readonly ValueComparer<List<BlueprintAttribute>> AttributeComparer = new(
        (a, b) => JsonSerializer.Serialize(a, Options) == JsonSerializer.Serialize(b, Options),
        value => value == null ? 0 : JsonSerializer.Serialize(value, Options).GetHashCode(),
        value => Deserialize<List<BlueprintAttribute>>(JsonSerializer.Serialize(value, Options)) ?? new());

    public static readonly ValueConverter<List<string>, string> StringList = new(
        value => JsonSerializer.Serialize(value, Options),
        json => Deserialize<List<string>>(json) ?? new());

    public static readonly ValueComparer<List<string>> StringComparer = new(
        (a, b) => JsonSerializer.Serialize(a, Options) == JsonSerializer.Serialize(b, Options),
        value => value == null ? 0 : JsonSerializer.Serialize(value, Options).GetHashCode(),
        value => Deserialize<List<string>>(JsonSerializer.Serialize(value, Options)) ?? new());

    private static T? Deserialize<T>(string json) where T : class
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            return JsonSerializer.Deserialize<T>(json, Options);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
