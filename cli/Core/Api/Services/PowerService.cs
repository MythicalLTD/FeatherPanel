using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Models;

namespace FeatherCli.Core.Api.Services;

public class PowerService : BaseApiService
{
    public PowerService(HttpClient httpClient, ConfigManager configManager, ILogger<PowerService> logger)
        : base(httpClient, configManager, logger)
    {
    }

    private async Task<bool> SendPowerActionAsync(string serverUuidShort, string action)
    {
        try
        {
            var endpoint = $"/api/user/servers/{serverUuidShort}/power/{action}";
            var request = await CreateRequestAsync(HttpMethod.Post, endpoint);
            var content = await SendRequestAsync(request, $"send power action ({action})");

            var apiResponse = JsonConvert.DeserializeObject<ApiResponse<PowerActionResponse>>(content);
            if (apiResponse == null)
            {
                throw new InvalidOperationException("Failed to deserialize power action response");
            }

            return apiResponse.Success && !apiResponse.Error;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed when sending power action");
            return false;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize power action response");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when sending power action");
            return false;
        }
    }

    public async Task<bool> StartServerAsync(string serverUuidShort)
    {
        return await SendPowerActionAsync(serverUuidShort, "start");
    }

    public async Task<bool> StopServerAsync(string serverUuidShort)
    {
        return await SendPowerActionAsync(serverUuidShort, "stop");
    }

    public async Task<bool> RestartServerAsync(string serverUuidShort)
    {
        return await SendPowerActionAsync(serverUuidShort, "restart");
    }

    public async Task<bool> KillServerAsync(string serverUuidShort)
    {
        return await SendPowerActionAsync(serverUuidShort, "kill");
    }
}

