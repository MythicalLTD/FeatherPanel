using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class NodeImportRequest
{
    [JsonProperty("node")]
    public NodeData? Node { get; set; }

    [JsonProperty("location_to_location_mapping")]
    public Dictionary<string, int>? LocationToLocationMapping { get; set; }

    [JsonProperty("generate_new_tokens")]
    public bool GenerateNewTokens { get; set; } = true;
}

public class NodeData
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("uuid")]
    public string? Uuid { get; set; }

    [JsonProperty("public")]
    public bool Public { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("location_id")]
    public int LocationId { get; set; }

    [JsonProperty("fqdn")]
    public string? Fqdn { get; set; }

    [JsonProperty("scheme")]
    public string? Scheme { get; set; }

    [JsonProperty("behind_proxy")]
    public bool BehindProxy { get; set; }

    [JsonProperty("maintenance_mode")]
    public bool MaintenanceMode { get; set; }

    [JsonProperty("memory")]
    public int Memory { get; set; }

    [JsonProperty("memory_overallocate")]
    public int MemoryOverallocate { get; set; }

    [JsonProperty("disk")]
    public int Disk { get; set; }

    [JsonProperty("disk_overallocate")]
    public int DiskOverallocate { get; set; }

    [JsonProperty("upload_size")]
    public int UploadSize { get; set; }

    [JsonProperty("daemonListen")]
    public int DaemonListen { get; set; }

    [JsonProperty("daemonSFTP")]
    public int DaemonSFTP { get; set; }

    [JsonProperty("daemonBase")]
    public string? DaemonBase { get; set; }

    [JsonProperty("daemon_token_id")]
    public string? DaemonTokenId { get; set; }

    [JsonProperty("daemon_token")]
    public string? DaemonToken { get; set; }
}

