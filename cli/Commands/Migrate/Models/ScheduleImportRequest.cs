using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class ScheduleImportRequest
{
    [JsonProperty("schedule")]
    public ScheduleData? Schedule { get; set; }

    [JsonProperty("server_to_server_mapping")]
    public Dictionary<string, int>? ServerToServerMapping { get; set; }
}

public class ScheduleData
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("server_id")]
    public int ServerId { get; set; }

    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("cron_day_of_week")]
    public string CronDayOfWeek { get; set; } = "*";

    [JsonProperty("cron_month")]
    public string CronMonth { get; set; } = "*";

    [JsonProperty("cron_day_of_month")]
    public string CronDayOfMonth { get; set; } = "*";

    [JsonProperty("cron_hour")]
    public string CronHour { get; set; } = "*";

    [JsonProperty("cron_minute")]
    public string CronMinute { get; set; } = "*";

    [JsonProperty("is_active")]
    public int IsActive { get; set; }

    [JsonProperty("is_processing")]
    public int IsProcessing { get; set; }

    [JsonProperty("only_when_online")]
    public int OnlyWhenOnline { get; set; }

    [JsonProperty("last_run_at")]
    public string? LastRunAt { get; set; }

    [JsonProperty("next_run_at")]
    public string? NextRunAt { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

