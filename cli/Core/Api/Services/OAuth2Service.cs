using System.Text;
using System.Web;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using FeatherCli.Core.Api.Models;
using FeatherCli.Core.Configuration;

namespace FeatherCli.Core.Api.Services;

public class OAuth2Service
{
    private readonly HttpClient _httpClient;
    private readonly ConfigManager _configManager;
    private readonly ILogger<OAuth2Service> _logger;

    public OAuth2Service(
        HttpClient httpClient,
        ConfigManager configManager,
        ILogger<OAuth2Service> logger)
    {
        _httpClient = httpClient;
        _configManager = configManager;
        _logger = logger;
    }

    /// <summary>
    /// Builds the OAuth2 authorization URL with query parameters
    /// </summary>
    public async Task<string?> BuildAuthorizationUrlAsync(OAuth2AuthorizationRequest request, string? panelUrlOverride = null)
    {
        try
        {
            var apiUrl = string.IsNullOrWhiteSpace(panelUrlOverride)
                ? await _configManager.GetApiUrlAsync()
                : panelUrlOverride;
            if (string.IsNullOrEmpty(apiUrl))
            {
                _logger.LogError("API URL is not configured");
                return null;
            }

            var baseUrl = apiUrl.TrimEnd('/');
            var queryParams = new Dictionary<string, string>
            {
                { "name", request.Name },
                { "callbackurl", request.CallbackUrl },
                { "mode", request.Mode }
            };

            if (!string.IsNullOrEmpty(request.AppName))
                queryParams["appName"] = request.AppName;

            if (!string.IsNullOrEmpty(request.AppLogo))
                queryParams["appLogo"] = request.AppLogo;

            if (!string.IsNullOrEmpty(request.Description))
                queryParams["description"] = request.Description;

            if (!string.IsNullOrEmpty(request.AllowedIps))
                queryParams["allowedips"] = request.AllowedIps;

            if (request.AlertCors)
                queryParams["alertCors"] = "true";

            var queryString = string.Join("&", queryParams.Select(kvp => 
                $"{HttpUtility.UrlEncode(kvp.Key)}={HttpUtility.UrlEncode(kvp.Value)}"));

            var authUrl = $"{baseUrl}/dashboard/account/oauth2/api/new?{queryString}";
            _logger.LogInformation("Built authorization URL");
            return authUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to build authorization URL");
            return null;
        }
    }

    /// <summary>
    /// Validates OAuth2 parameters via metadata endpoint
    /// </summary>
    public async Task<OAuth2MetadataResponse?> ValidateMetadataAsync(OAuth2AuthorizationRequest request)
    {
        try
        {
            var apiUrl = await _configManager.GetApiUrlAsync();
            var apiKey = await _configManager.GetApiKeyAsync();

            if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
            {
                _logger.LogError("API URL or API Key is not configured");
                return null;
            }

            var baseUrl = apiUrl.TrimEnd('/');
            var queryParams = new Dictionary<string, string>
            {
                { "name", request.Name },
                { "callbackurl", request.CallbackUrl },
                { "mode", request.Mode }
            };

            if (!string.IsNullOrEmpty(request.AppName))
                queryParams["appName"] = request.AppName;

            if (!string.IsNullOrEmpty(request.Description))
                queryParams["description"] = request.Description;

            if (!string.IsNullOrEmpty(request.AllowedIps))
                queryParams["allowedips"] = request.AllowedIps;

            var queryString = string.Join("&", queryParams.Select(kvp => 
                $"{HttpUtility.UrlEncode(kvp.Key)}={HttpUtility.UrlEncode(kvp.Value)}"));

            var url = $"{baseUrl}/api/user/api-clients/oauth2/metadata?{queryString}";

            var request_msg = new HttpRequestMessage(HttpMethod.Get, url);
            request_msg.Headers.Add("Authorization", $"Bearer {apiKey}");
            request_msg.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(request_msg);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Metadata validation failed. Status: {StatusCode}", response.StatusCode);
                return null;
            }

            var metadataResponse = JsonConvert.DeserializeObject<OAuth2MetadataResponse>(content);
            _logger.LogInformation("Metadata validation completed. Valid: {Valid}", metadataResponse?.Success);
            return metadataResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate metadata");
            return null;
        }
    }

    /// <summary>
    /// Exchanges authorization code for credentials
    /// </summary>
    public async Task<OAuth2TokenExchangeResponse?> ExchangeCodeAsync(string authorizationCode)
    {
        try
        {
            var apiUrl = await _configManager.GetApiUrlAsync();
            var apiKey = await _configManager.GetApiKeyAsync();

            if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
            {
                _logger.LogError("API URL or API Key is not configured");
                return null;
            }

            var baseUrl = apiUrl.TrimEnd('/');
            var url = $"{baseUrl}/api/user/api-clients/oauth2/token";

            var tokenRequest = new OAuth2TokenExchangeRequest
            {
                AuthorizationCode = authorizationCode
            };

            var content = new StringContent(
                JsonConvert.SerializeObject(tokenRequest),
                Encoding.UTF8,
                "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };
            request.Headers.Add("Authorization", $"Bearer {apiKey}");
            request.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Token exchange failed. Status: {StatusCode}", response.StatusCode);
                return null;
            }

            var tokenResponse = JsonConvert.DeserializeObject<OAuth2TokenExchangeResponse>(responseContent);
            _logger.LogInformation("Token exchange completed successfully");
            return tokenResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to exchange authorization code");
            return null;
        }
    }

    /// <summary>
    /// Validates issued credentials
    /// </summary>
    public async Task<ApiClientValidationResponse?> ValidateCredentialsAsync(string publicKey, string? panelUrlOverride = null)
    {
        try
        {
            var apiUrl = string.IsNullOrWhiteSpace(panelUrlOverride)
                ? await _configManager.GetApiUrlAsync()
                : panelUrlOverride;
            var apiKey = await _configManager.GetApiKeyAsync();

            if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
            {
                _logger.LogError("API URL or API Key is not configured");
                return null;
            }

            var baseUrl = apiUrl.TrimEnd('/');
            var url = $"{baseUrl}/api/user/api-clients/validate";

            var validationRequest = new ApiClientValidationRequest
            {
                PublicKey = publicKey
            };

            var content = new StringContent(
                JsonConvert.SerializeObject(validationRequest),
                Encoding.UTF8,
                "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };
            request.Headers.Add("Authorization", $"Bearer {apiKey}");
            request.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Credential validation failed. Status: {StatusCode}", response.StatusCode);
                return null;
            }

            var validationResponse = JsonConvert.DeserializeObject<ApiClientValidationResponse>(responseContent);
            _logger.LogInformation("Credential validation completed. Valid: {Valid}", validationResponse?.Valid);
            return validationResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate credentials");
            return null;
        }
    }

    /// <summary>
    /// Parses OAuth2 callback fragment (for user mode)
    /// </summary>
    public OAuth2UserModeCallback ParseCallbackFragment(string fragment)
    {
        var callback = new OAuth2UserModeCallback();

        if (string.IsNullOrEmpty(fragment))
            return callback;

        // Remove leading # if present
        if (fragment.StartsWith("#"))
            fragment = fragment.Substring(1);

        var parameters = HttpUtility.ParseQueryString(fragment);

        callback.PublicKey = parameters["public_key"];
        callback.PrivateKey = parameters["private_key"];
        callback.TokenType = parameters["token_type"];
        callback.IssuedAt = parameters["issued_at"];
        callback.AuthorizationCode = parameters["authorization_code"];
        callback.Error = parameters["error"];
        callback.ErrorDescription = parameters["error_description"];

        return callback;
    }
}
