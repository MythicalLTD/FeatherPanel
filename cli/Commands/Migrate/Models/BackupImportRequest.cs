using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class BackupImportRequest
{
    [JsonProperty("backup")]
    public BackupData? Backup { get; set; }

    [JsonProperty("server_to_server_mapping")]
    public Dictionary<string, int>? ServerToServerMapping { get; set; }
}

public class BackupData
{
    [JsonProperty("id")]
    public long? Id { get; set; } // Optional - preserve Pterodactyl backup ID for migrations

    [JsonProperty("server_id")]
    public int ServerId { get; set; }

    [JsonProperty("uuid")]
    public string? Uuid { get; set; }

    [JsonProperty("upload_id")]
    public string? UploadId { get; set; }

    [JsonProperty("is_successful")]
    public bool IsSuccessful { get; set; }

    [JsonProperty("is_locked")]
    public bool IsLocked { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("ignored_files")]
    public string? IgnoredFiles { get; set; }

    [JsonProperty("disk")]
    public string? Disk { get; set; }

    [JsonProperty("checksum")]
    public string? Checksum { get; set; }

    [JsonProperty("bytes")]
    public long? Bytes { get; set; }

    [JsonProperty("completed_at")]
    public string? CompletedAt { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

