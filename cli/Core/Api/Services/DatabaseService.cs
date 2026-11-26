using System.Text;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Models;

namespace FeatherCli.Core.Api.Services;

public class DatabaseService : BaseApiService
{
    public DatabaseService(HttpClient httpClient, ConfigManager configManager, ILogger<DatabaseService> logger)
        : base(httpClient, configManager, logger)
    {
    }

    public async Task<PaginatedListResponse<ServerDatabase>> ListAsync(string uuid, int page = 1, int perPage = 25)
    {
        var request = await CreateRequestAsync(HttpMethod.Get,
            $"/api/user/servers/{uuid}/databases?page={page}&per_page={perPage}");
        var content = await SendRequestAsync(request, "list databases");
        return Unpack<PaginatedListResponse<ServerDatabase>>(content);
    }

    public async Task<List<DatabaseHostInfo>> ListHostsAsync(string uuid)
    {
        var request = await CreateRequestAsync(HttpMethod.Get, $"/api/user/servers/{uuid}/databases/hosts");
        var content = await SendRequestAsync(request, "list database hosts");
        return Unpack<List<DatabaseHostInfo>>(content);
    }

    public async Task<DatabaseCreateResult> CreateAsync(string uuid, DatabaseCreateRequest body)
    {
        var request = await CreateRequestAsync(HttpMethod.Post, $"/api/user/servers/{uuid}/databases");
        request.Content = new StringContent(JsonConvert.SerializeObject(body), Encoding.UTF8, "application/json");
        var content = await SendRequestAsync(request, "create database");
        return Unpack<DatabaseCreateResult>(content);
    }

    public async Task DeleteAsync(string uuid, int databaseId)
    {
        var request = await CreateRequestAsync(HttpMethod.Delete,
            $"/api/user/servers/{uuid}/databases/{databaseId}");
        await SendRequestAsync(request, "delete database");
    }
}
