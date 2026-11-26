using System.Text;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Models;

namespace FeatherCli.Core.Api.Services;

public class ScheduleService : BaseApiService
{
    public ScheduleService(HttpClient httpClient, ConfigManager configManager, ILogger<ScheduleService> logger)
        : base(httpClient, configManager, logger)
    {
    }

    public async Task<PaginatedListResponse<ServerSchedule>> ListAsync(string uuid, int page = 1, int perPage = 25)
    {
        var request = await CreateRequestAsync(HttpMethod.Get,
            $"/api/user/servers/{uuid}/schedules?page={page}&per_page={perPage}");
        var content = await SendRequestAsync(request, "list schedules");
        return Unpack<PaginatedListResponse<ServerSchedule>>(content);
    }

    public async Task<ServerSchedule> CreateAsync(string uuid, ScheduleCreateRequest body)
    {
        var request = await CreateRequestAsync(HttpMethod.Post, $"/api/user/servers/{uuid}/schedules");
        request.Content = new StringContent(JsonConvert.SerializeObject(body), Encoding.UTF8, "application/json");
        var content = await SendRequestAsync(request, "create schedule");
        return Unpack<ServerSchedule>(content);
    }

    public async Task DeleteAsync(string uuid, int scheduleId)
    {
        var request = await CreateRequestAsync(HttpMethod.Delete,
            $"/api/user/servers/{uuid}/schedules/{scheduleId}");
        await SendRequestAsync(request, "delete schedule");
    }

    public async Task RunAsync(string uuid, int scheduleId)
    {
        var request = await CreateRequestAsync(HttpMethod.Post,
            $"/api/user/servers/{uuid}/schedules/{scheduleId}/run");
        await SendRequestAsync(request, "run schedule");
    }

    public async Task<ScheduleToggleResult> ToggleAsync(string uuid, int scheduleId)
    {
        var request = await CreateRequestAsync(HttpMethod.Post,
            $"/api/user/servers/{uuid}/schedules/{scheduleId}/toggle");
        var content = await SendRequestAsync(request, "toggle schedule");
        return Unpack<ScheduleToggleResult>(content);
    }
}
