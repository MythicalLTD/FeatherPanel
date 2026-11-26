using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class SshKeyImportRequest
{
    [JsonProperty("ssh_key")]
    public SshKeyData? SshKey { get; set; }

    [JsonProperty("user_to_user_mapping")]
    public Dictionary<string, int>? UserToUserMapping { get; set; }
}

public class SshKeyData
{
    [JsonProperty("id")]
    public int? Id { get; set; } // Optional - preserve Pterodactyl SSH key ID for migrations

    [JsonProperty("user_id")]
    public int UserId { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("public_key")]
    public string? PublicKey { get; set; }

    [JsonProperty("fingerprint")]
    public string? Fingerprint { get; set; } // Optional - will be generated if not provided
}

