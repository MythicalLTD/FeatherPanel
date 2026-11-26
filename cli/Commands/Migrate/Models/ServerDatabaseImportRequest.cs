using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class ServerDatabaseImportRequest
{
    [JsonProperty("database")]
    public ServerDatabaseData? Database { get; set; }

    [JsonProperty("server_to_server_mapping")]
    public Dictionary<string, int>? ServerToServerMapping { get; set; }

    [JsonProperty("database_host_to_database_host_mapping")]
    public Dictionary<string, int>? DatabaseHostToDatabaseHostMapping { get; set; }
}

public class ServerDatabaseData
{
    [JsonProperty("id")]
    public int? Id { get; set; } // Optional - preserve Pterodactyl database ID for migrations

    [JsonProperty("server_id")]
    public int ServerId { get; set; }

    [JsonProperty("database_host_id")]
    public int DatabaseHostId { get; set; }

    [JsonProperty("database")]
    public string? Database { get; set; }

    [JsonProperty("username")]
    public string? Username { get; set; }

    [JsonProperty("remote")]
    public string? Remote { get; set; }

    [JsonProperty("password")]
    public string? Password { get; set; } // Encrypted

    [JsonProperty("max_connections")]
    public int? MaxConnections { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

