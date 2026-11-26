using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class SubuserImportRequest
{
    [JsonProperty("subuser")]
    public SubuserData? Subuser { get; set; }

    [JsonProperty("user_to_user_mapping")]
    public Dictionary<string, int>? UserToUserMapping { get; set; }

    [JsonProperty("server_to_server_mapping")]
    public Dictionary<string, int>? ServerToServerMapping { get; set; }
}

public class SubuserData
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("user_id")]
    public int UserId { get; set; }

    [JsonProperty("server_id")]
    public int ServerId { get; set; }

    [JsonProperty("permissions")]
    public string Permissions { get; set; } = "[]";

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}
