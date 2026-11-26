using System.Text.Json.Serialization;
using System.Text.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class MigrationState
{
    [JsonPropertyName("pterodactyl_path")]
    public string? PterodactylPath { get; set; }

    [JsonPropertyName("migration_mode")]
    public string? MigrationMode { get; set; }

    [JsonPropertyName("sql_dump_path")]
    public string? SqlDumpPath { get; set; }

    [JsonPropertyName("env_file_path")]
    public string? EnvFilePath { get; set; }

    [JsonPropertyName("staging_database")]
    public string? StagingDatabase { get; set; }

    [JsonPropertyName("current_step")]
    public string? CurrentStep { get; set; }

    [JsonPropertyName("last_completed_step")]
    public string? LastCompletedStep { get; set; }

    [JsonPropertyName("completed_steps")]
    public List<string> CompletedSteps { get; set; } = new();

    [JsonPropertyName("started_at")]
    public DateTime? StartedAt { get; set; }

    [JsonPropertyName("last_updated")]
    public DateTime? LastUpdated { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "in_progress"; // in_progress, completed, failed, paused

    [JsonPropertyName("error_message")]
    public string? ErrorMessage { get; set; }

    [JsonPropertyName("step_details")]
    public Dictionary<string, object> StepDetails { get; set; } = new();
}

