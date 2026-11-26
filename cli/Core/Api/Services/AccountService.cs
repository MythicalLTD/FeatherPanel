using System.Text;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Models;

namespace FeatherCli.Core.Api.Services;

public class AccountService : BaseApiService
{
    public AccountService(HttpClient httpClient, ConfigManager configManager, ILogger<AccountService> logger)
        : base(httpClient, configManager, logger)
    {
    }

    public async Task<SshKeyListResponse> ListSshKeysAsync(int page = 1, int limit = 50)
    {
        var request = await CreateRequestAsync(HttpMethod.Get,
            $"/api/user/ssh-keys?page={page}&limit={limit}");
        var content = await SendRequestAsync(request, "list ssh keys");
        return Unpack<SshKeyListResponse>(content);
    }

    public async Task<UserSshKey> CreateSshKeyAsync(string name, string publicKey)
    {
        var request = await CreateRequestAsync(HttpMethod.Post, "/api/user/ssh-keys");
        request.Content = new StringContent(
            JsonConvert.SerializeObject(new SshKeyCreateRequest { Name = name, PublicKey = publicKey }),
            Encoding.UTF8,
            "application/json");
        var content = await SendRequestAsync(request, "create ssh key");
        return Unpack<UserSshKey>(content);
    }

    public async Task DeleteSshKeyAsync(int id)
    {
        var request = await CreateRequestAsync(HttpMethod.Delete, $"/api/user/ssh-keys/{id}");
        await SendRequestAsync(request, "delete ssh key");
    }

    public async Task<List<UserNotification>> ListNotificationsAsync()
    {
        var request = await CreateRequestAsync(HttpMethod.Get, "/api/user/notifications");
        var content = await SendRequestAsync(request, "list notifications");
        var response = Unpack<NotificationsResponse>(content);
        return response.Notifications ?? new List<UserNotification>();
    }

    public async Task DismissNotificationAsync(int id)
    {
        var request = await CreateRequestAsync(HttpMethod.Post, $"/api/user/notifications/{id}/dismiss");
        await SendRequestAsync(request, "dismiss notification");
    }
}
