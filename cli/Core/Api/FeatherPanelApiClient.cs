using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Text;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Models;
using FeatherCli.Core.Api.Services;
using FeatherCli.Commands.Migrate.Models;

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
    private readonly BackupService _backupService;
    private readonly FileService _fileService;
    private readonly DatabaseService _databaseService;
    private readonly ScheduleService _scheduleService;
    private readonly AccountService _accountService;

    public FeatherPanelApiClient(
        HttpClient httpClient, 
        ConfigManager configManager, 
        ILogger<FeatherPanelApiClient> logger,
        ServerService serverService,
        PowerService powerService,
        LogService logService,
        BackupService backupService,
        FileService fileService,
        DatabaseService databaseService,
        ScheduleService scheduleService,
        AccountService accountService)
    {
        _httpClient = httpClient;
        _configManager = configManager;
        _logger = logger;
        _serverService = serverService;
        _powerService = powerService;
        _logService = logService;
        _backupService = backupService;
        _fileService = fileService;
        _databaseService = databaseService;
        _scheduleService = scheduleService;
        _accountService = accountService;
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

    public Task<PaginatedListResponse<ServerBackup>> ListBackupsAsync(string uuid, int page = 1, int perPage = 25)
        => _backupService.ListAsync(uuid, page, perPage);

    public Task<BackupCreateResult> CreateBackupAsync(string uuid, string? name = null)
        => _backupService.CreateAsync(uuid, name);

    public Task DeleteBackupAsync(string uuid, string backupUuid)
        => _backupService.DeleteAsync(uuid, backupUuid);

    public Task RestoreBackupAsync(string uuid, string backupUuid, bool truncateDirectory = false)
        => _backupService.RestoreAsync(uuid, backupUuid, truncateDirectory);

    public Task<BackupDownloadResult> GetBackupDownloadUrlAsync(string uuid, string backupUuid)
        => _backupService.GetDownloadUrlAsync(uuid, backupUuid);

    public Task LockBackupAsync(string uuid, string backupUuid)
        => _backupService.LockAsync(uuid, backupUuid);

    public Task UnlockBackupAsync(string uuid, string backupUuid)
        => _backupService.UnlockAsync(uuid, backupUuid);

    public Task<List<ServerFileItem>> ListFilesAsync(string uuid, string path = "/")
        => _fileService.ListAsync(uuid, path);

    public Task<byte[]> ReadFileAsync(string uuid, string path)
        => _fileService.ReadAsync(uuid, path);

    public Task WriteFileAsync(string uuid, string path, byte[] content)
        => _fileService.WriteAsync(uuid, path, content);

    public Task DeleteFilesAsync(string uuid, IEnumerable<string> files, string root = "/")
        => _fileService.DeleteAsync(uuid, files, root);

    public Task CreateDirectoryAsync(string uuid, string parentPath, string name)
        => _fileService.CreateDirectoryAsync(uuid, parentPath, name);

    public Task<PaginatedListResponse<ServerDatabase>> ListDatabasesAsync(string uuid, int page = 1, int perPage = 25)
        => _databaseService.ListAsync(uuid, page, perPage);

    public Task<List<DatabaseHostInfo>> ListDatabaseHostsAsync(string uuid)
        => _databaseService.ListHostsAsync(uuid);

    public Task<DatabaseCreateResult> CreateDatabaseAsync(string uuid, DatabaseCreateRequest body)
        => _databaseService.CreateAsync(uuid, body);

    public Task DeleteDatabaseAsync(string uuid, int databaseId)
        => _databaseService.DeleteAsync(uuid, databaseId);

    public Task<PaginatedListResponse<ServerSchedule>> ListSchedulesAsync(string uuid, int page = 1, int perPage = 25)
        => _scheduleService.ListAsync(uuid, page, perPage);

    public Task<ServerSchedule> CreateScheduleAsync(string uuid, ScheduleCreateRequest body)
        => _scheduleService.CreateAsync(uuid, body);

    public Task DeleteScheduleAsync(string uuid, int scheduleId)
        => _scheduleService.DeleteAsync(uuid, scheduleId);

    public Task RunScheduleAsync(string uuid, int scheduleId)
        => _scheduleService.RunAsync(uuid, scheduleId);

    public Task<ScheduleToggleResult> ToggleScheduleAsync(string uuid, int scheduleId)
        => _scheduleService.ToggleAsync(uuid, scheduleId);

    public Task<SshKeyListResponse> ListSshKeysAsync(int page = 1, int limit = 50)
        => _accountService.ListSshKeysAsync(page, limit);

    public Task<UserSshKey> CreateSshKeyAsync(string name, string publicKey)
        => _accountService.CreateSshKeyAsync(name, publicKey);

    public Task DeleteSshKeyAsync(int id)
        => _accountService.DeleteSshKeyAsync(id);

    public Task<List<UserNotification>> ListNotificationsAsync()
        => _accountService.ListNotificationsAsync();

    public Task DismissNotificationAsync(int id)
        => _accountService.DismissNotificationAsync(id);

    // Migration/Import Methods
    public async Task<PrerequisitesResponse?> CheckPrerequisitesAsync()
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/pterodactyl-importer/prerequisites";
        
        _logger.LogDebug("Checking prerequisites at: {Url}", url);

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
                _logger.LogError("Failed to check prerequisites. Status: {StatusCode}", response.StatusCode);
                return null;
            }

            var prerequisitesResponse = JsonConvert.DeserializeObject<PrerequisitesResponse>(content);
            
            if (prerequisitesResponse == null)
            {
                _logger.LogError("Failed to deserialize prerequisites response");
                return null;
            }

            if (prerequisitesResponse.Error)
            {
                _logger.LogError("API returned error: {ErrorMessage}", prerequisitesResponse.ErrorMessage);
                return prerequisitesResponse;
            }

            _logger.LogInformation("Successfully checked prerequisites");
            return prerequisitesResponse;
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
            _logger.LogError(ex, "Unexpected error when checking prerequisites");
            return null;
        }
    }

    // Settings Update Method
    public async Task<Core.Models.SettingsUpdateResponse?> UpdateSettingsAsync(SettingsUpdateRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/settings";
        
        _logger.LogDebug("Updating settings at: {Url}", url);

        try
        {
            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });
            
            _logger.LogDebug("Sending settings update JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Patch, url)
            {
                Content = content
            };
            
            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");
            requestMessage.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Response content: {Content}", responseContent);

            // Try to deserialize the response regardless of status code
            var settingsResponse = JsonConvert.DeserializeObject<Core.Models.SettingsUpdateResponse>(responseContent);
            
            if (settingsResponse == null)
            {
                // If we can't deserialize, create an error response
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to update settings. Status: {StatusCode}, Content: {Content}", 
                        response.StatusCode, responseContent);
                    return new Core.Models.SettingsUpdateResponse
                    {
                        Success = false,
                        Error = true,
                        ErrorMessage = $"HTTP {response.StatusCode}: {responseContent}"
                    };
                }
                
                _logger.LogError("Failed to deserialize settings update response");
                return new Core.Models.SettingsUpdateResponse
                {
                    Success = false,
                    Error = true,
                    ErrorMessage = "Failed to parse API response"
                };
            }

            if (!response.IsSuccessStatusCode || settingsResponse.Error)
            {
                var errorMsg = settingsResponse.ErrorMessage ?? $"HTTP {response.StatusCode}";
                _logger.LogError("API returned error: {ErrorMessage}", errorMsg);
                settingsResponse.Error = true;
                settingsResponse.Success = false;
                if (string.IsNullOrEmpty(settingsResponse.ErrorMessage))
                {
                    settingsResponse.ErrorMessage = errorMsg;
                }
                return settingsResponse;
            }

            _logger.LogInformation("Successfully updated settings");
            return settingsResponse;
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
            _logger.LogError(ex, "Unexpected error when updating settings");
            return null;
        }
    }

    // Location Creation Method
    public async Task<Core.Models.LocationCreateResponse?> CreateLocationAsync(LocationCreateRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/locations";
        
        _logger.LogDebug("Creating location at: {Url}", url);

        try
        {
            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });
            
            _logger.LogDebug("Sending location create JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = content
            };
            
            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");
            requestMessage.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Response content: {Content}", responseContent);

            // Try to deserialize the response regardless of status code
            var locationResponse = JsonConvert.DeserializeObject<Core.Models.LocationCreateResponse>(responseContent);
            
            if (locationResponse == null)
            {
                // If we can't deserialize, create an error response
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to create location. Status: {StatusCode}, Content: {Content}", 
                        response.StatusCode, responseContent);
                    return new Core.Models.LocationCreateResponse
                    {
                        Success = false,
                        Error = true,
                        ErrorMessage = $"HTTP {response.StatusCode}: {responseContent}"
                    };
                }
                
                _logger.LogError("Failed to deserialize location create response");
                return new Core.Models.LocationCreateResponse
                {
                    Success = false,
                    Error = true,
                    ErrorMessage = "Failed to parse API response"
                };
            }

            if (!response.IsSuccessStatusCode || locationResponse.Error)
            {
                var errorMsg = locationResponse.ErrorMessage ?? $"HTTP {response.StatusCode}";
                _logger.LogError("API returned error: {ErrorMessage}", errorMsg);
                locationResponse.Error = true;
                locationResponse.Success = false;
                if (string.IsNullOrEmpty(locationResponse.ErrorMessage))
                {
                    locationResponse.ErrorMessage = errorMsg;
                }
                return locationResponse;
            }

            _logger.LogInformation("Successfully created location");
            return locationResponse;
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
            _logger.LogError(ex, "Unexpected error when creating location");
            return null;
        }
    }

    // Realm Creation Method
    public async Task<Core.Models.RealmCreateResponse?> CreateRealmAsync(RealmCreateRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/realms";
        
        _logger.LogDebug("Creating realm at: {Url}", url);

        try
        {
            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });
            
            _logger.LogDebug("Sending realm create JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = content
            };
            
            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");
            requestMessage.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Response content: {Content}", responseContent);

            // Try to deserialize the response regardless of status code
            var realmResponse = JsonConvert.DeserializeObject<Core.Models.RealmCreateResponse>(responseContent);
            
            if (realmResponse == null)
            {
                // If we can't deserialize, create an error response
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to create realm. Status: {StatusCode}, Content: {Content}", 
                        response.StatusCode, responseContent);
                    return new Core.Models.RealmCreateResponse
                    {
                        Success = false,
                        Error = true,
                        ErrorMessage = $"HTTP {response.StatusCode}: {responseContent}"
                    };
                }
                
                _logger.LogError("Failed to deserialize realm create response");
                return new Core.Models.RealmCreateResponse
                {
                    Success = false,
                    Error = true,
                    ErrorMessage = "Failed to parse API response"
                };
            }

            if (!response.IsSuccessStatusCode || realmResponse.Error)
            {
                var errorMsg = realmResponse.ErrorMessage ?? $"HTTP {response.StatusCode}";
                _logger.LogError("API returned error: {ErrorMessage}", errorMsg);
                realmResponse.Error = true;
                realmResponse.Success = false;
                if (string.IsNullOrEmpty(realmResponse.ErrorMessage))
                {
                    realmResponse.ErrorMessage = errorMsg;
                }
                return realmResponse;
            }

            _logger.LogInformation("Successfully created realm");
            return realmResponse;
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
            _logger.LogError(ex, "Unexpected error when creating realm");
            return null;
        }
    }

    // Egg Import Method
    public async Task<Core.Models.EggImportResponse?> ImportEggAsync(EggImportRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/pterodactyl-importer/import-egg";
        
        _logger.LogDebug("Importing egg at: {Url}", url);

        try
        {
            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });
            
            _logger.LogDebug("Sending egg import JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };
            
            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");
            requestMessage.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Response content: {Content}", responseContent);

            // Try to deserialize the response regardless of status code
            var eggResponse = JsonConvert.DeserializeObject<Core.Models.EggImportResponse>(responseContent);
            
            if (eggResponse == null)
            {
                // If we can't deserialize, create an error response
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to import egg. Status: {StatusCode}, Content: {Content}", 
                        response.StatusCode, responseContent);
                    return new Core.Models.EggImportResponse
                    {
                        Success = false,
                        Error = true,
                        ErrorMessage = $"HTTP {response.StatusCode}: {responseContent}"
                    };
                }
                
                _logger.LogError("Failed to deserialize egg import response");
                return new Core.Models.EggImportResponse
                {
                    Success = false,
                    Error = true,
                    ErrorMessage = "Failed to parse API response"
                };
            }

            if (!response.IsSuccessStatusCode || eggResponse.Error)
            {
                var errorMsg = eggResponse.ErrorMessage ?? $"HTTP {response.StatusCode}";
                _logger.LogError("API returned error: {ErrorMessage}", errorMsg);
                eggResponse.Error = true;
                eggResponse.Success = false;
                if (string.IsNullOrEmpty(eggResponse.ErrorMessage))
                {
                    eggResponse.ErrorMessage = errorMsg;
                }
                return eggResponse;
            }

            _logger.LogInformation("Successfully imported egg");
            return eggResponse;
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
            _logger.LogError(ex, "Unexpected error when importing egg");
            return null;
        }
    }

    public async Task<Core.Models.NodeImportResponse?> ImportNodeAsync(FeatherCli.Commands.Migrate.Models.NodeImportRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/pterodactyl-importer/import-node";
        
        _logger.LogDebug("Importing node to: {Url}", url);

        try
        {
            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });

            _logger.LogDebug("Sending node import JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };
            
            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");
            requestMessage.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Response content: {Content}", responseContent);

            // Try to deserialize the response regardless of status code
            var nodeResponse = JsonConvert.DeserializeObject<Core.Models.NodeImportResponse>(responseContent);
            
            if (nodeResponse == null)
            {
                // If we can't deserialize, create an error response
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to import node. Status: {StatusCode}, Content: {Content}", 
                        response.StatusCode, responseContent);
                    return new Core.Models.NodeImportResponse
                    {
                        Success = false,
                        Error = true,
                        ErrorMessage = $"HTTP {response.StatusCode}: {responseContent}"
                    };
                }
                
                _logger.LogError("Failed to deserialize node import response");
                return new Core.Models.NodeImportResponse
                {
                    Success = false,
                    Error = true,
                    ErrorMessage = "Failed to parse API response"
                };
            }

            if (!response.IsSuccessStatusCode || nodeResponse.Error)
            {
                var errorMsg = nodeResponse.ErrorMessage ?? $"HTTP {response.StatusCode}";
                _logger.LogError("API returned error: {ErrorMessage}", errorMsg);
                nodeResponse.Error = true;
                nodeResponse.Success = false;
                if (string.IsNullOrEmpty(nodeResponse.ErrorMessage))
                {
                    nodeResponse.ErrorMessage = errorMsg;
                }
                return nodeResponse;
            }

            _logger.LogInformation("Successfully imported node");
            return nodeResponse;
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
            _logger.LogError(ex, "Unexpected error when importing node");
            return null;
        }
    }

    public async Task<Core.Models.DatabaseHostCreateResponse?> CreateDatabaseHostAsync(FeatherCli.Commands.Migrate.Models.DatabaseHostCreateRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/databases";
        
        _logger.LogDebug("Creating database host at: {Url}", url);

        try
        {
            // Don't send node_id if it's 0 or null (API will unset it anyway)
            var requestToSend = new
            {
                id = request.Id, // Preserve Pterodactyl database host ID
                name = request.Name,
                node_id = request.NodeId.HasValue && request.NodeId.Value != 0 ? request.NodeId.Value : (int?)null,
                database_type = request.DatabaseType,
                database_port = request.DatabasePort,
                database_username = request.DatabaseUsername,
                database_password = request.DatabasePassword,
                database_host = request.DatabaseHost
            };

            var jsonContent = JsonConvert.SerializeObject(requestToSend, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });

            _logger.LogDebug("Sending database host create JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = content
            };
            
            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");
            requestMessage.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Response content: {Content}", responseContent);

            // Try to deserialize the response regardless of status code
            Core.Models.DatabaseHostCreateResponse? dbResponse = null;
            try
            {
                dbResponse = JsonConvert.DeserializeObject<Core.Models.DatabaseHostCreateResponse>(responseContent);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to deserialize database host create response");
                _logger.LogError("Raw response content: {Content}", responseContent);
            }
            
            if (dbResponse == null)
            {
                // If we can't deserialize, create an error response with full body
                return new Core.Models.DatabaseHostCreateResponse
                {
                    Success = false,
                    Error = true,
                    ErrorMessage = !response.IsSuccessStatusCode 
                        ? $"HTTP {response.StatusCode}. Full response: {responseContent}"
                        : $"Failed to parse API response. Full response: {responseContent}"
                };
            }

            if (!response.IsSuccessStatusCode || dbResponse.Error)
            {
                var errorMsg = dbResponse.ErrorMessage ?? $"HTTP {response.StatusCode}";
                _logger.LogError("API returned error: {ErrorMessage}", errorMsg);
                dbResponse.Error = true;
                dbResponse.Success = false;
                if (string.IsNullOrEmpty(dbResponse.ErrorMessage))
                {
                    dbResponse.ErrorMessage = errorMsg;
                }
                return dbResponse;
            }

            _logger.LogInformation("Successfully created database host");
            return dbResponse;
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
            _logger.LogError(ex, "Unexpected error when creating database host");
            return null;
        }
    }

    public async Task<Core.Models.AllocationImportResponse?> ImportAllocationAsync(FeatherCli.Commands.Migrate.Models.AllocationImportRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/pterodactyl-importer/import-allocation";
        
        _logger.LogDebug("Importing allocation to: {Url}", url);

        try
        {
            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });

            _logger.LogDebug("Sending allocation import JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };
            
            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");
            requestMessage.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Response content: {Content}", responseContent);

            // Try to deserialize the response regardless of status code
            Core.Models.AllocationImportResponse? allocationResponse = null;
            try
            {
                allocationResponse = JsonConvert.DeserializeObject<Core.Models.AllocationImportResponse>(responseContent);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to deserialize allocation import response");
                _logger.LogError("Raw response content: {Content}", responseContent);
            }
            
            if (allocationResponse == null)
            {
                // If we can't deserialize, create an error response with full body
                return new Core.Models.AllocationImportResponse
                {
                    Success = false,
                    Error = true,
                    ErrorMessage = !response.IsSuccessStatusCode 
                        ? $"HTTP {response.StatusCode}. Full response: {responseContent}"
                        : $"Failed to parse API response. Full response: {responseContent}"
                };
            }

            if (!response.IsSuccessStatusCode || allocationResponse.Error)
            {
                var errorMsg = allocationResponse.ErrorMessage ?? $"HTTP {response.StatusCode}";
                _logger.LogError("API returned error: {ErrorMessage}", errorMsg);
                allocationResponse.Error = true;
                allocationResponse.Success = false;
                if (string.IsNullOrEmpty(allocationResponse.ErrorMessage))
                {
                    allocationResponse.ErrorMessage = errorMsg;
                }
                return allocationResponse;
            }

            _logger.LogInformation("Successfully imported allocation");
            return allocationResponse;
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
            _logger.LogError(ex, "Unexpected error when importing allocation");
            return null;
        }
    }

    public async Task<Core.Models.UserImportResponse?> ImportUserAsync(FeatherCli.Commands.Migrate.Models.UserImportRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/pterodactyl-importer/import-user";
        
        _logger.LogDebug("Importing user to: {Url}", url);

        try
        {
            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });

            _logger.LogDebug("Sending user import JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };
            
            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");
            requestMessage.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Response content: {Content}", responseContent);

            // Try to deserialize the response regardless of status code
            Core.Models.UserImportResponse? userResponse = null;
            try
            {
                userResponse = JsonConvert.DeserializeObject<Core.Models.UserImportResponse>(responseContent);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to deserialize user import response");
                _logger.LogError("Raw response content: {Content}", responseContent);
            }
            
            if (userResponse == null)
            {
                // If we can't deserialize, create an error response with full body
                return new Core.Models.UserImportResponse
                {
                    Success = false,
                    Error = true,
                    ErrorMessage = !response.IsSuccessStatusCode 
                        ? $"HTTP {response.StatusCode}. Full response: {responseContent}"
                        : $"Failed to parse API response. Full response: {responseContent}"
                };
            }

            if (!response.IsSuccessStatusCode || userResponse.Error)
            {
                var errorMsg = userResponse.ErrorMessage ?? $"HTTP {response.StatusCode}";
                _logger.LogError("API returned error: {ErrorMessage}", errorMsg);
                userResponse.Error = true;
                userResponse.Success = false;
                if (string.IsNullOrEmpty(userResponse.ErrorMessage))
                {
                    userResponse.ErrorMessage = errorMsg;
                }
                return userResponse;
            }

            _logger.LogInformation("Successfully imported user");
            return userResponse;
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
            _logger.LogError(ex, "Unexpected error when importing user");
            return null;
        }
    }

    public async Task<Core.Models.SshKeyImportResponse?> ImportSshKeyAsync(FeatherCli.Commands.Migrate.Models.SshKeyImportRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/pterodactyl-importer/import-ssh-key";
        
        _logger.LogDebug("Importing SSH key to: {Url}", url);

        try
        {
            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });

            _logger.LogDebug("Sending SSH key import JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };
            
            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");
            requestMessage.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Response content: {Content}", responseContent);

            // Try to deserialize the response regardless of status code
            Core.Models.SshKeyImportResponse? sshKeyResponse = null;
            try
            {
                sshKeyResponse = JsonConvert.DeserializeObject<Core.Models.SshKeyImportResponse>(responseContent);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to deserialize SSH key import response");
                _logger.LogError("Raw response content: {Content}", responseContent);
            }
            
            if (sshKeyResponse == null)
            {
                // If we can't deserialize, create an error response with full body
                return new Core.Models.SshKeyImportResponse
                {
                    Success = false,
                    Error = true,
                    ErrorMessage = !response.IsSuccessStatusCode 
                        ? $"HTTP {response.StatusCode}. Full response: {responseContent}"
                        : $"Failed to parse API response. Full response: {responseContent}"
                };
            }

            if (!response.IsSuccessStatusCode || sshKeyResponse.Error)
            {
                var errorMsg = sshKeyResponse.ErrorMessage ?? $"HTTP {response.StatusCode}";
                _logger.LogError("API returned error: {ErrorMessage}", errorMsg);
                sshKeyResponse.Error = true;
                sshKeyResponse.Success = false;
                if (string.IsNullOrEmpty(sshKeyResponse.ErrorMessage))
                {
                    sshKeyResponse.ErrorMessage = errorMsg;
                }
                return sshKeyResponse;
            }

            _logger.LogInformation("Successfully imported SSH key");
            return sshKeyResponse;
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
            _logger.LogError(ex, "Unexpected error when importing SSH key");
            return null;
        }
    }

    public async Task<Core.Models.ServerImportResponse?> ImportServerAsync(FeatherCli.Commands.Migrate.Models.ServerImportRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/pterodactyl-importer/import-server";
        
        _logger.LogDebug("Importing server to: {Url}", url);

        try
        {
            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });

            _logger.LogDebug("Sending server import JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };
            
            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");
            requestMessage.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Response content: {Content}", responseContent);

            // Try to deserialize the response regardless of status code
            Core.Models.ServerImportResponse? serverResponse = null;
            try
            {
                serverResponse = JsonConvert.DeserializeObject<Core.Models.ServerImportResponse>(responseContent);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to deserialize server import response");
                _logger.LogError("Raw response content: {Content}", responseContent);
            }
            
            if (serverResponse == null)
            {
                // If we can't deserialize, create an error response with full body
                return new Core.Models.ServerImportResponse
                {
                    Success = false,
                    Error = true,
                    ErrorMessage = !response.IsSuccessStatusCode 
                        ? $"HTTP {response.StatusCode}. Full response: {responseContent}"
                        : $"Failed to parse API response. Full response: {responseContent}"
                };
            }

            if (!response.IsSuccessStatusCode || serverResponse.Error)
            {
                var errorMsg = serverResponse.ErrorMessage ?? $"HTTP {response.StatusCode}";
                _logger.LogError("API returned error: {ErrorMessage}", errorMsg);
                serverResponse.Error = true;
                serverResponse.Success = false;
                if (string.IsNullOrEmpty(serverResponse.ErrorMessage))
                {
                    serverResponse.ErrorMessage = errorMsg;
                }
                return serverResponse;
            }

            _logger.LogInformation("Successfully imported server");
            return serverResponse;
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
            _logger.LogError(ex, "Unexpected error when importing server");
            return null;
        }
    }

    public async Task<Core.Models.ServerDatabaseImportResponse?> ImportServerDatabaseAsync(FeatherCli.Commands.Migrate.Models.ServerDatabaseImportRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/pterodactyl-importer/import-server-database";
        
        _logger.LogDebug("Importing server database to: {Url}", url);

        try
        {
            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });

            _logger.LogDebug("Sending server database import JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };

            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Server database import response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Server database import response body: {ResponseBody}", responseContent);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("API returned error status: {StatusCode}, body: {ResponseBody}", response.StatusCode, responseContent);
            }

            var result = JsonConvert.DeserializeObject<Core.Models.ServerDatabaseImportResponse>(responseContent);
            
            if (result != null && !response.IsSuccessStatusCode)
            {
                result.Error = true;
                if (string.IsNullOrEmpty(result.ErrorMessage))
                {
                    result.ErrorMessage = $"API returned error: {responseContent}";
                }
            }

            return result;
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
            _logger.LogError(ex, "Unexpected error when importing server database");
            return null;
        }
    }

    public async Task<Core.Models.BackupImportResponse?> ImportBackupAsync(FeatherCli.Commands.Migrate.Models.BackupImportRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        var url = $"{apiUrl.TrimEnd('/')}/api/admin/pterodactyl-importer/import-backup";
        
        _logger.LogDebug("Importing backup to: {Url}", url);

        try
        {
            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });

            _logger.LogDebug("Sending backup import JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };

            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Backup import response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Backup import response body: {ResponseBody}", responseContent);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("API returned error status: {StatusCode}, body: {ResponseBody}", response.StatusCode, responseContent);
            }

            var result = JsonConvert.DeserializeObject<Core.Models.BackupImportResponse>(responseContent);
            
            if (result != null && !response.IsSuccessStatusCode)
            {
                result.Error = true;
                if (string.IsNullOrEmpty(result.ErrorMessage))
                {
                    result.ErrorMessage = $"API returned error: {responseContent}";
                }
            }

            return result;
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
            _logger.LogError(ex, "Unexpected error when importing backup");
            return null;
        }
    }

    public async Task<Core.Models.SubuserImportResponse?> ImportSubuserAsync(FeatherCli.Commands.Migrate.Models.SubuserImportRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        try
        {
            var url = $"{apiUrl.TrimEnd('/')}/api/admin/pterodactyl-importer/import-subuser";

            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DateFormatString = "yyyy-MM-dd HH:mm:ss"
            });

            _logger.LogDebug("Sending subuser import JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };

            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Subuser import response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Subuser import response body: {ResponseBody}", responseContent);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("API returned error status: {StatusCode}, body: {ResponseBody}", response.StatusCode, responseContent);
            }

            var result = JsonConvert.DeserializeObject<Core.Models.SubuserImportResponse>(responseContent);
            
            if (result != null && !response.IsSuccessStatusCode)
            {
                result.Error = true;
                if (string.IsNullOrEmpty(result.ErrorMessage))
                {
                    result.ErrorMessage = $"API returned error: {responseContent}";
                }
            }

            return result;
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
            _logger.LogError(ex, "Unexpected error when importing subuser");
            return null;
        }
    }

    public async Task<Core.Models.ScheduleImportResponse?> ImportScheduleAsync(FeatherCli.Commands.Migrate.Models.ScheduleImportRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        try
        {
            var url = $"{apiUrl.TrimEnd('/')}/api/admin/pterodactyl-importer/import-schedule";

            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DateFormatString = "yyyy-MM-dd HH:mm:ss"
            });

            _logger.LogDebug("Sending schedule import JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };

            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Schedule import response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Schedule import response body: {ResponseBody}", responseContent);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("API returned error status: {StatusCode}, body: {ResponseBody}", response.StatusCode, responseContent);
            }

            var result = JsonConvert.DeserializeObject<Core.Models.ScheduleImportResponse>(responseContent);
            
            if (result != null && !response.IsSuccessStatusCode)
            {
                result.Error = true;
                if (string.IsNullOrEmpty(result.ErrorMessage))
                {
                    result.ErrorMessage = $"API returned error: {responseContent}";
                }
            }

            return result;
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
            _logger.LogError(ex, "Unexpected error when importing schedule");
            return null;
        }
    }

    public async Task<Core.Models.TaskImportResponse?> ImportTaskAsync(FeatherCli.Commands.Migrate.Models.TaskImportRequest request)
    {
        var apiUrl = await _configManager.GetApiUrlAsync();
        var apiKey = await _configManager.GetApiKeyAsync();

        if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API URL or API Key is not configured");
            return null;
        }

        try
        {
            var url = $"{apiUrl.TrimEnd('/')}/api/admin/pterodactyl-importer/import-task";

            var jsonContent = JsonConvert.SerializeObject(request, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DateFormatString = "yyyy-MM-dd HH:mm:ss"
            });

            _logger.LogDebug("Sending task import JSON: {Json}", jsonContent);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };

            requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");

            var response = await _httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("Task import response status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("Task import response body: {ResponseBody}", responseContent);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("API returned error status: {StatusCode}, body: {ResponseBody}", response.StatusCode, responseContent);
            }

            var result = JsonConvert.DeserializeObject<Core.Models.TaskImportResponse>(responseContent);
            
            if (result != null && !response.IsSuccessStatusCode)
            {
                result.Error = true;
                if (string.IsNullOrEmpty(result.ErrorMessage))
                {
                    result.ErrorMessage = $"API returned error: {responseContent}";
                }
            }

            return result;
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
            _logger.LogError(ex, "Unexpected error when importing task");
            return null;
        }
    }
}
