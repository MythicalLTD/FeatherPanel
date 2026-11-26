using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class AllocationImportRequest
{
    [JsonProperty("allocation")]
    public AllocationData? Allocation { get; set; }

    [JsonProperty("node_to_node_mapping")]
    public Dictionary<string, int>? NodeToNodeMapping { get; set; }

    [JsonProperty("server_to_server_mapping")]
    public Dictionary<string, int>? ServerToServerMapping { get; set; }
}

public class AllocationData
{
    [JsonProperty("id")]
    public int? Id { get; set; } // Optional - preserve Pterodactyl allocation ID for migrations

    [JsonProperty("node_id")]
    public int NodeId { get; set; }

    [JsonProperty("ip")]
    public string? Ip { get; set; }

    [JsonProperty("ip_alias")]
    public string? IpAlias { get; set; }

    [JsonProperty("port")]
    public int Port { get; set; }

    [JsonProperty("server_id")]
    public int? ServerId { get; set; } // Optional - will be set to null if unknown/non-existent

    [JsonProperty("notes")]
    public string? Notes { get; set; }
}

