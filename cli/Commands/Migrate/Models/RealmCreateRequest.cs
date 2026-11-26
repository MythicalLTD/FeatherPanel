using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class RealmCreateRequest
{
    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("description")]
    public string? Description { get; set; }
    
    [JsonProperty("id")]
    public int? Id { get; set; } // Optional - preserve Pterodactyl nest ID for migrations (WHMCS compatibility)
}

