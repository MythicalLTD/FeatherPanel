using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class DatabaseHostCreateRequest
{
    [JsonProperty("id")]
    public int? Id { get; set; } // Optional - preserve Pterodactyl database host ID for migrations (WHMCS compatibility)

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("node_id")]
    public int? NodeId { get; set; } // Optional - don't send if null or 0

    [JsonProperty("database_type")]
    public string? DatabaseType { get; set; } = "mysql"; // Default to mysql

    [JsonProperty("database_port")]
    public int DatabasePort { get; set; }

    [JsonProperty("database_username")]
    public string? DatabaseUsername { get; set; }

    [JsonProperty("database_password")]
    public string? DatabasePassword { get; set; }

    [JsonProperty("database_host")]
    public string? DatabaseHost { get; set; }
}

