using System.Text;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Models;

namespace FeatherCli.Core.Api.Services;

public class BackupService : BaseApiService
{
    public BackupService(HttpClient httpClient, ConfigManager configManager, ILogger<BackupService> logger)
        : base(httpClient, configManager, logger)
    {
    }

    public async Task<PaginatedListResponse<ServerBackup>> ListAsync(string uuid, int page = 1, int perPage = 25)
    {
        var request = await CreateRequestAsync(HttpMethod.Get,
            $"/api/user/servers/{uuid}/backups?page={page}&per_page={perPage}");
        var content = await SendRequestAsync(request, "list backups");
        return Unpack<PaginatedListResponse<ServerBackup>>(content);
    }

    public async Task<BackupCreateResult> CreateAsync(string uuid, string? name = null)
    {
        var request = await CreateRequestAsync(HttpMethod.Post, $"/api/user/servers/{uuid}/backups");
        request.Content = new StringContent(
            JsonConvert.SerializeObject(new BackupCreateRequest { Name = name }),
            Encoding.UTF8,
            "application/json");
        var content = await SendRequestAsync(request, "create backup");
        return Unpack<BackupCreateResult>(content);
    }

    public async Task DeleteAsync(string uuid, string backupUuid)
    {
        var request = await CreateRequestAsync(HttpMethod.Delete,
            $"/api/user/servers/{uuid}/backups/{backupUuid}");
        await SendRequestAsync(request, "delete backup");
    }

    public async Task RestoreAsync(string uuid, string backupUuid, bool truncateDirectory = false)
    {
        var request = await CreateRequestAsync(HttpMethod.Post,
            $"/api/user/servers/{uuid}/backups/{backupUuid}/restore");
        request.Content = new StringContent(
            JsonConvert.SerializeObject(new BackupRestoreRequest { TruncateDirectory = truncateDirectory }),
            Encoding.UTF8,
            "application/json");
        await SendRequestAsync(request, "restore backup");
    }

    public async Task<BackupDownloadResult> GetDownloadUrlAsync(string uuid, string backupUuid)
    {
        var request = await CreateRequestAsync(HttpMethod.Get,
            $"/api/user/servers/{uuid}/backups/{backupUuid}/download");
        var content = await SendRequestAsync(request, "get backup download url");
        return Unpack<BackupDownloadResult>(content);
    }

    public async Task LockAsync(string uuid, string backupUuid)
    {
        var request = await CreateRequestAsync(HttpMethod.Post,
            $"/api/user/servers/{uuid}/backups/{backupUuid}/lock");
        await SendRequestAsync(request, "lock backup");
    }

    public async Task UnlockAsync(string uuid, string backupUuid)
    {
        var request = await CreateRequestAsync(HttpMethod.Post,
            $"/api/user/servers/{uuid}/backups/{backupUuid}/unlock");
        await SendRequestAsync(request, "unlock backup");
    }
}
