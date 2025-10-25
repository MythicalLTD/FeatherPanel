using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Models;
using FeatherCli.Core.Api.Services;

namespace FeatherCli.Core.Api;

public class FeatherPanelApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ConfigManager _configManager;
    private readonly ILogger<FeatherPanelApiClient> _logger;

    // Services
    private readonly ServerService _serverService;
    private readonly PowerService _powerService;
    private readonly LogService _logService;

    public FeatherPanelApiClient(
        HttpClient httpClient, 
        ConfigManager configManager, 
        ILogger<FeatherPanelApiClient> logger,
        ServerService serverService,
        PowerService powerService,
        LogService logService)
    {
        _httpClient = httpClient;
        _configManager = configManager;
        _logger = logger;
        _serverService = serverService;
        _powerService = powerService;
        _logService = logService;
    }

    public async Task<bool> ValidateConnectionAsync()
    {
        try
        {
            var session = await GetUserSessionAsync();
            return session != null;
        }
        catch
        {
            return false;
        }
    }

    public async Task<UserSession?> GetUserSessionAsync()
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/user/session";
        
        _logger.LogDebug("Getting user session from: {Url}", url);

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("Authorization", $"Bearer {apiKey}");
            request.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Response content: {Content}", content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to get user session. Status: {StatusCode}", response.StatusCode);
                return null;
            }

            var apiResponse = JsonConvert.DeserializeObject<ApiResponse<UserSession>>(content);
            if (apiResponse == null)
            {
                _logger.LogError("Failed to deserialize session response");
                return null;
            }

            if (apiResponse.Error)
            {
                _logger.LogError("API returned error: {ErrorMessage}", apiResponse.ErrorMessage);
                return null;
            }

            _logger.LogInformation("Successfully retrieved user session");
            return apiResponse.Data;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed");
            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize response");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when getting user session");
            return null;
        }
    }

    // Server Service Methods
    public async Task<ServerListResponse?> GetServersAsync(int page = 1, int limit = 10, string? search = null)
    {
        return await _serverService.GetServersAsync(page, limit, search);
    }

    public async Task<DetailedServerResponse> GetServerDetailsAsync(string serverUuidShort)
    {
        return await _serverService.GetServerDetailsAsync(serverUuidShort);
    }

    public async Task<ReinstallServerResponse> ReinstallServerAsync(string serverUuidShort)
    {
        return await _serverService.ReinstallServerAsync(serverUuidShort);
    }

    public async Task<bool> SendServerCommandAsync(string serverUuidShort, string command)
    {
        return await _serverService.SendServerCommandAsync(serverUuidShort, command);
    }

    // Power Service Methods
    public async Task<bool> StartServerAsync(string serverUuidShort)
    {
        return await _powerService.StartServerAsync(serverUuidShort);
    }

    public async Task<bool> StopServerAsync(string serverUuidShort)
    {
        return await _powerService.StopServerAsync(serverUuidShort);
    }

    public async Task<bool> RestartServerAsync(string serverUuidShort)
    {
        return await _powerService.RestartServerAsync(serverUuidShort);
    }

    public async Task<bool> KillServerAsync(string serverUuidShort)
    {
        return await _powerService.KillServerAsync(serverUuidShort);
    }

    // Log Service Methods
    public async Task<LogsApiResponse> GetServerLogsAsync(string serverUuidShort)
    {
        return await _logService.GetServerLogsAsync(serverUuidShort);
    }

    public async Task<InstallLogsApiResponse> GetServerInstallLogsAsync(string serverUuidShort)
    {
        return await _logService.GetServerInstallLogsAsync(serverUuidShort);
    }

    public async Task<LogUploadResponse> UploadServerLogsAsync(string serverUuidShort)
    {
        return await _logService.UploadServerLogsAsync(serverUuidShort);
    }

    public async Task<LogUploadResponse> UploadServerInstallLogsAsync(string serverUuidShort)
    {
        return await _logService.UploadServerInstallLogsAsync(serverUuidShort);
    }
}
