using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class ServerImportRequest
{
    [JsonProperty("server")]
    public ServerData? Server { get; set; }

    [JsonProperty("server_variables")]
    public List<ServerVariableData>? ServerVariables { get; set; }

    [JsonProperty("nest_to_realm_mapping")]
    public Dictionary<string, int>? NestToRealmMapping { get; set; }

    [JsonProperty("egg_to_spell_mapping")]
    public Dictionary<string, int>? EggToSpellMapping { get; set; }

    [JsonProperty("node_to_node_mapping")]
    public Dictionary<string, int>? NodeToNodeMapping { get; set; }

    [JsonProperty("user_to_user_mapping")]
    public Dictionary<string, int>? UserToUserMapping { get; set; }

    [JsonProperty("allocation_to_allocation_mapping")]
    public Dictionary<string, int>? AllocationToAllocationMapping { get; set; }

    [JsonProperty("variable_to_variable_mapping")]
    public Dictionary<string, int>? VariableToVariableMapping { get; set; }

    [JsonProperty("server_to_server_mapping")]
    public Dictionary<string, int>? ServerToServerMapping { get; set; }
}

public class ServerData
{
    [JsonProperty("id")]
    public int? Id { get; set; } // Optional - preserve Pterodactyl server ID for migrations

    [JsonProperty("uuid")]
    public string? Uuid { get; set; }

    [JsonProperty("uuidShort")]
    public string? UuidShort { get; set; }

    [JsonProperty("node_id")]
    public int NodeId { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("status")]
    public string? Status { get; set; }

    [JsonProperty("skip_scripts")]
    public bool SkipScripts { get; set; }

    [JsonProperty("owner_id")]
    public int OwnerId { get; set; }

    [JsonProperty("memory")]
    public int Memory { get; set; }

    [JsonProperty("swap")]
    public int Swap { get; set; }

    [JsonProperty("disk")]
    public int Disk { get; set; }

    [JsonProperty("io")]
    public int Io { get; set; }

    [JsonProperty("cpu")]
    public int Cpu { get; set; }

    [JsonProperty("threads")]
    public string? Threads { get; set; }

    [JsonProperty("oom_disabled")]
    public bool OomDisabled { get; set; }

    [JsonProperty("allocation_id")]
    public int AllocationId { get; set; }

    [JsonProperty("nest_id")]
    public int NestId { get; set; }

    [JsonProperty("egg_id")]
    public int EggId { get; set; }

    [JsonProperty("spell_id")]
    public int? SpellId { get; set; }

    [JsonProperty("startup")]
    public string? Startup { get; set; }

    [JsonProperty("image")]
    public string? Image { get; set; }

    [JsonProperty("allocation_limit")]
    public int? AllocationLimit { get; set; }

    [JsonProperty("database_limit")]
    public int DatabaseLimit { get; set; }

    [JsonProperty("backup_limit")]
    public int BackupLimit { get; set; }

    [JsonProperty("parent_id")]
    public int? ParentId { get; set; }

    [JsonProperty("external_id")]
    public string? ExternalId { get; set; }

    [JsonProperty("installed_at")]
    public string? InstalledAt { get; set; }
}

public class ServerVariableData
{
    [JsonProperty("id")]
    public int? Id { get; set; } // Optional

    [JsonProperty("variable_id")]
    public int VariableId { get; set; } // Egg variable ID (will be mapped to spell variable ID)

    [JsonProperty("variable_value")]
    public string? VariableValue { get; set; }
}

