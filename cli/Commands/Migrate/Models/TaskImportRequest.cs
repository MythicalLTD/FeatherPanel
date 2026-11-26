using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class TaskImportRequest
{
    [JsonProperty("task")]
    public TaskData? Task { get; set; }

    [JsonProperty("schedule_to_schedule_mapping")]
    public Dictionary<string, int>? ScheduleToScheduleMapping { get; set; }
}

public class TaskData
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("schedule_id")]
    public int ScheduleId { get; set; }

    [JsonProperty("sequence_id")]
    public int SequenceId { get; set; }

    [JsonProperty("action")]
    public string Action { get; set; } = string.Empty;

    [JsonProperty("payload")]
    public string Payload { get; set; } = string.Empty;

    [JsonProperty("time_offset")]
    public int TimeOffset { get; set; }

    [JsonProperty("is_queued")]
    public int IsQueued { get; set; }

    [JsonProperty("continue_on_failure")]
    public int ContinueOnFailure { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

