using System.Net.Http.Headers;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FeatherCli.Core.Helpers;

/// <summary>
/// Upload logs to MythicalSystems Paste API (mclo.gs-compatible).
/// API: https://pastes.mythicalsystems.org — viewer: https://paste.mythicalsystems.org
/// </summary>
public static class LoggerHelper
{
    public const string PasteApiBase = "https://pastes.mythicalsystems.org";
    public const string PasteViewerBase = "https://paste.mythicalsystems.org";

    private const int MaxPasteBytes = 10_485_760; // 10 MiB
    private const int MaxPasteLines = 25_000;

    /// <summary>
    /// Optional team API key. Set FEATHERCLI_PASTE_API_KEY for higher limits / retention.
    /// </summary>
    public static string? ApiKey { get; set; } =
        Environment.GetEnvironmentVariable("FEATHERCLI_PASTE_API_KEY");

    public static async Task<PasteUploadResult> UploadLogsFromFileAsync(
        string path,
        string source = "feathercli",
        CancellationToken cancellationToken = default)
    {
        if (!File.Exists(path))
        {
            throw new FileNotFoundException("The requested log file was not found on the system", path);
        }

        var content = await File.ReadAllTextAsync(path, cancellationToken);
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException("The requested log file is empty");
        }

        return await UploadPasteAsync(content, source, cancellationToken);
    }

    /// <summary>Synchronous wrapper for UploadLogsFromFileAsync.</summary>
    public static PasteUploadResult UploadLogsToSupport(string path, string source = "feathercli")
        => UploadLogsFromFileAsync(path, source).GetAwaiter().GetResult();

    public static async Task<PasteUploadResult> UploadPasteAsync(
        string content,
        string source = "feathercli",
        CancellationToken cancellationToken = default)
    {
        content = TruncateForPaste(content);

        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{PasteApiBase}/log");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var apiKey = ApiKey;
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        }

        var payload = JsonConvert.SerializeObject(new
        {
            content,
            source
        });
        request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        JObject? data;
        try
        {
            data = JObject.Parse(body);
        }
        catch (JsonException)
        {
            return PasteUploadResult.Fail($"Invalid JSON response (HTTP {(int)response.StatusCode})");
        }

        var success = data.Value<bool?>("success") == true;
        if (!response.IsSuccessStatusCode || !success)
        {
            var error = data.Value<string>("error")
                ?? data.Value<string>("message")
                ?? $"Paste API error (HTTP {(int)response.StatusCode})";
            return PasteUploadResult.Fail(error);
        }

        return NormalizePasteResponse(data);
    }

    private static PasteUploadResult NormalizePasteResponse(JObject data)
    {
        var id = data.Value<string>("id") ?? data.Value<string>("key") ?? "";
        if (string.IsNullOrEmpty(id))
        {
            return PasteUploadResult.Fail("Paste response missing id");
        }

        return new PasteUploadResult
        {
            Success = true,
            Id = id,
            Url = data.Value<string>("url") ?? $"{PasteViewerBase}/p/{id}",
            Raw = data.Value<string>("raw") ?? $"{PasteApiBase}/raw/{id}",
            Token = data.Value<string>("token"),
        };
    }

    private static string TruncateForPaste(string content)
    {
        var lines = content.Split(new[] { "\r\n", "\n", "\r" }, StringSplitOptions.None);
        if (lines.Length > MaxPasteLines)
        {
            content = string.Join("\n", lines.AsSpan(lines.Length - MaxPasteLines).ToArray());
        }

        if (Encoding.UTF8.GetByteCount(content) > MaxPasteBytes)
        {
            // Keep the tail within the byte budget (UTF-8 safe enough for logs).
            var bytes = Encoding.UTF8.GetBytes(content);
            content = Encoding.UTF8.GetString(bytes, bytes.Length - MaxPasteBytes, MaxPasteBytes);
        }

        return content;
    }
}

public sealed class PasteUploadResult
{
    public bool Success { get; init; }
    public string? Id { get; init; }
    public string? Url { get; init; }
    public string? Raw { get; init; }
    /// <summary>Delete token — returned once; store securely.</summary>
    public string? Token { get; init; }
    public string? Error { get; init; }

    public static PasteUploadResult Fail(string error) => new()
    {
        Success = false,
        Error = error
    };
}
