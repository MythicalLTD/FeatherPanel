using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Models;

namespace FeatherCli.Core.Api.Services;

public class ServerService : BaseApiService
{
    public ServerService(HttpClient httpClient, ConfigManager configManager, ILogger<ServerService> logger)
        : base(httpClient, configManager, logger)
    {
    }

    public async Task<ServerListResponse?> GetServersAsync(int page = 1, int limit = 10, string? search = null)
    {
        try
        {
            var endpoint = $"/api/user/servers?page={page}&limit={limit}";
            if (!string.IsNullOrEmpty(search))
            {
                endpoint += $"&search={Uri.EscapeDataString(search)}";
            }

            var request = await CreateRequestAsync(HttpMethod.Get, endpoint);
            var content = await SendRequestAsync(request, "get servers");

            var apiResponse = JsonConvert.DeserializeObject<ApiResponse<ServerListResponse>>(content);
            if (apiResponse == null)
            {
                throw new InvalidOperationException("Failed to deserialize servers response");
            }

            if (apiResponse.Error)
            {
                _logger.LogError("API returned error: {ErrorMessage}", apiResponse.ErrorMessage);
                throw new InvalidOperationException($"API Error: {apiResponse.ErrorMessage}");
            }

            return apiResponse.Data;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed when getting servers");
            throw;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize servers response");
            throw new InvalidOperationException("Failed to parse servers response", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when getting servers");
            throw;
        }
    }

    public async Task<DetailedServerResponse> GetServerDetailsAsync(string serverUuidShort)
    {
        try
        {
            var endpoint = $"/api/user/servers/{serverUuidShort}";
            var request = await CreateRequestAsync(HttpMethod.Get, endpoint);
            var content = await SendRequestAsync(request, "get server details");

            var serverResponse = JsonConvert.DeserializeObject<DetailedServerResponse>(content);
            if (serverResponse == null)
            {
                throw new InvalidOperationException("Failed to deserialize server details response");
            }

            if (serverResponse.Error)
            {
                _logger.LogError("API returned error: {ErrorMessage}", serverResponse.ErrorMessage);
                throw new InvalidOperationException($"API Error: {serverResponse.ErrorMessage}");
            }

            return serverResponse;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed when getting server details");
            throw;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize server details response");
            throw new InvalidOperationException("Failed to parse server details response", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when getting server details");
            throw;
        }
    }

    public async Task<ReinstallServerResponse> ReinstallServerAsync(string serverUuidShort)
    {
        try
        {
            var endpoint = $"/api/user/servers/{serverUuidShort}/reinstall";
            var request = await CreateRequestAsync(HttpMethod.Post, endpoint);
            var content = await SendRequestAsync(request, "reinstall server");

            var reinstallResponse = JsonConvert.DeserializeObject<ReinstallServerResponse>(content);
            if (reinstallResponse == null)
            {
                throw new InvalidOperationException("Failed to deserialize reinstall response");
            }

            if (reinstallResponse.Error)
            {
                _logger.LogError("API returned error: {ErrorMessage}", reinstallResponse.ErrorMessage);
                throw new InvalidOperationException($"API Error: {reinstallResponse.ErrorMessage}");
            }

            return reinstallResponse;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed when reinstalling server");
            throw;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize reinstall response");
            throw new InvalidOperationException("Failed to parse reinstall response", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when reinstalling server");
            throw;
        }
    }

    public async Task<bool> SendServerCommandAsync(string serverUuidShort, string command)
    {
        try
        {
            var endpoint = $"/api/user/servers/{serverUuidShort}/command";
            var request = await CreateRequestAsync(HttpMethod.Post, endpoint);
            
            var commandRequest = new CommandRequest { Command = command };
            var jsonContent = JsonConvert.SerializeObject(commandRequest);
            request.Content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var content = await SendRequestAsync(request, "send server command");

            var apiResponse = JsonConvert.DeserializeObject<ApiResponse<CommandResponse>>(content);
            if (apiResponse == null)
            {
                throw new InvalidOperationException("Failed to deserialize command response");
            }

            return apiResponse.Success && !apiResponse.Error;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed with status: {StatusCode}, Error: {Message}", 
                ex.StatusCode, ex.Message);
            return false;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize command response");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when sending server command");
            return false;
        }
    }
}

