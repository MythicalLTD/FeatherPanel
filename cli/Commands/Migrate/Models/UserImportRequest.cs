using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class UserImportRequest
{
    [JsonProperty("user")]
    public UserData? User { get; set; }
}

public class UserData
{
    [JsonProperty("id")]
    public int? Id { get; set; } // Optional - preserve Pterodactyl user ID for migrations (ID 1 is reserved and will be skipped)

    [JsonProperty("uuid")]
    public string? Uuid { get; set; }

    [JsonProperty("username")]
    public string? Username { get; set; }

    [JsonProperty("email")]
    public string? Email { get; set; }

    [JsonProperty("name_first")]
    public string? NameFirst { get; set; }

    [JsonProperty("name_last")]
    public string? NameLast { get; set; }

    [JsonProperty("password")]
    public string? Password { get; set; } // Bcrypt hashed password

    [JsonProperty("remember_token")]
    public string? RememberToken { get; set; }

    [JsonProperty("external_id")]
    public string? ExternalId { get; set; }

    [JsonProperty("root_admin")]
    public bool RootAdmin { get; set; }

    [JsonProperty("language")]
    public string? Language { get; set; }
}

