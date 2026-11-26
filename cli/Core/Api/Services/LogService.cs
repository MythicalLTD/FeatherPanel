using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Models;

namespace FeatherCli.Core.Api.Services;

public class LogService : BaseApiService
{
    public LogService(HttpClient httpClient, ConfigManager configManager, ILogger<LogService> logger)
        : base(httpClient, configManager, logger)
    {
    }

    public async Task<LogsApiResponse> GetServerLogsAsync(string serverUuidShort)
    {
        try
        {
            var endpoint = $"/api/user/servers/{serverUuidShort}/logs";
            var request = await CreateRequestAsync(HttpMethod.Get, endpoint);
            var content = await SendRequestAsync(request, "get server logs");

            var logsResponse = JsonConvert.DeserializeObject<LogsApiResponse>(content);
            if (logsResponse == null)
            {
                throw new InvalidOperationException("Failed to deserialize logs response");
            }

            if (logsResponse.Error)
            {
                _logger.LogError("API returned error: {ErrorMessage}", logsResponse.ErrorMessage);
                throw new InvalidOperationException($"API Error: {logsResponse.ErrorMessage}");
            }

            return logsResponse;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed when getting server logs");
            throw;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize logs response");
            throw new InvalidOperationException("Failed to parse logs response", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when getting server logs");
            throw;
        }
    }

    public async Task<InstallLogsApiResponse> GetServerInstallLogsAsync(string serverUuidShort)
    {
        try
        {
            var endpoint = $"/api/user/servers/{serverUuidShort}/install-logs";
            var request = await CreateRequestAsync(HttpMethod.Get, endpoint);
            var content = await SendRequestAsync(request, "get server install logs");

            var installLogsResponse = JsonConvert.DeserializeObject<InstallLogsApiResponse>(content);
            if (installLogsResponse == null)
            {
                throw new InvalidOperationException("Failed to deserialize install logs response");
            }

            if (installLogsResponse.Error)
            {
                _logger.LogError("API returned error: {ErrorMessage}", installLogsResponse.ErrorMessage);
                throw new InvalidOperationException($"API Error: {installLogsResponse.ErrorMessage}");
            }

            return installLogsResponse;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed when getting server install logs");
            throw;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize install logs response");
            throw new InvalidOperationException("Failed to parse install logs response", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when getting server install logs");
            throw;
        }
    }

    public async Task<LogUploadResponse> UploadServerLogsAsync(string serverUuidShort)
    {
        try
        {
            var endpoint = $"/api/user/servers/{serverUuidShort}/logs/upload";
            var request = await CreateRequestAsync(HttpMethod.Post, endpoint);
            var content = await SendRequestAsync(request, "upload server logs");

            var uploadResponse = JsonConvert.DeserializeObject<LogUploadResponse>(content);
            if (uploadResponse == null)
            {
                throw new InvalidOperationException("Failed to deserialize log upload response");
            }

            if (uploadResponse.Error)
            {
                _logger.LogError("API returned error: {ErrorMessage}", uploadResponse.ErrorMessage);
                throw new InvalidOperationException($"API Error: {uploadResponse.ErrorMessage}");
            }

            return uploadResponse;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed when uploading server logs");
            throw;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize log upload response");
            throw new InvalidOperationException("Failed to parse log upload response", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when uploading server logs");
            throw;
        }
    }

    public async Task<LogUploadResponse> UploadServerInstallLogsAsync(string serverUuidShort)
    {
        try
        {
            var endpoint = $"/api/user/servers/{serverUuidShort}/install-logs/upload";
            var request = await CreateRequestAsync(HttpMethod.Post, endpoint);
            var content = await SendRequestAsync(request, "upload server install logs");

            var uploadResponse = JsonConvert.DeserializeObject<LogUploadResponse>(content);
            if (uploadResponse == null)
            {
                throw new InvalidOperationException("Failed to deserialize install log upload response");
            }

            if (uploadResponse.Error)
            {
                _logger.LogError("API returned error: {ErrorMessage}", uploadResponse.ErrorMessage);
                throw new InvalidOperationException($"API Error: {uploadResponse.ErrorMessage}");
            }

            return uploadResponse;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed when uploading server install logs");
            throw;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize install log upload response");
            throw new InvalidOperationException("Failed to parse install log upload response", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when uploading server install logs");
            throw;
        }
    }
}

