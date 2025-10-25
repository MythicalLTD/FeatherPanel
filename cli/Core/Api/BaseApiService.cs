using Microsoft.Extensions.Logging;
using FeatherCli.Core.Configuration;

namespace FeatherCli.Core.Api;

public abstract class BaseApiService
{
    protected readonly HttpClient _httpClient;
    protected readonly ConfigManager _configManager;
    protected readonly ILogger _logger;

    protected BaseApiService(HttpClient httpClient, ConfigManager configManager, ILogger logger)
    {
        _httpClient = httpClient;
        _configManager = configManager;
        _logger = logger;
    }

    protected async Task<HttpRequestMessage> CreateRequestAsync(HttpMethod method, string endpoint)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException("API URL and API Key must be configured. Run 'feathercli config setup' first.");
        }

        var url = $"{apiUrl.TrimEnd('/')}{endpoint}";
        _logger.LogDebug("Making request to: {Url}", url);

        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("Authorization", $"Bearer {apiKey}");
        request.Headers.Add("Accept", "application/json");

        return request;
    }

    protected async Task<string> SendRequestAsync(HttpRequestMessage request, string operationDescription)
    {
        var response = await _httpClient.SendAsync(request);
        var content = await response.Content.ReadAsStringAsync();

        _logger.LogDebug("Response status: {StatusCode}", response.StatusCode);
        _logger.LogDebug("Response content: {Content}", content);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Failed to {Operation}. Status: {StatusCode}, Content: {Content}", 
                operationDescription, response.StatusCode, content);
            throw new HttpRequestException($"Failed to {operationDescription}: {response.StatusCode}");
        }

        return content;
    }
}

