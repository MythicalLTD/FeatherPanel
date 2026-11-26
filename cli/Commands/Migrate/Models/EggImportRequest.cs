using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class EggImportRequest
{
    [JsonProperty("egg")]
    public EggData? Egg { get; set; }

    [JsonProperty("variables")]
    public List<SpellVariableData>? Variables { get; set; }

    [JsonProperty("nest_to_realm_mapping")]
    public Dictionary<string, int>? NestToRealmMapping { get; set; }
}

public class EggData
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("uuid")]
    public string? Uuid { get; set; }

    [JsonProperty("nest_id")]
    public int NestId { get; set; }

    [JsonProperty("author")]
    public string? Author { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("features")]
    public string? Features { get; set; }

    [JsonProperty("docker_images")]
    public string? DockerImages { get; set; }

    [JsonProperty("file_denylist")]
    public string? FileDenylist { get; set; }

    [JsonProperty("update_url")]
    public string? UpdateUrl { get; set; }

    [JsonProperty("config_files")]
    public string? ConfigFiles { get; set; }

    [JsonProperty("config_startup")]
    public string? ConfigStartup { get; set; }

    [JsonProperty("config_logs")]
    public string? ConfigLogs { get; set; }

    [JsonProperty("config_stop")]
    public string? ConfigStop { get; set; }

    [JsonProperty("startup")]
    public string? Startup { get; set; }

    [JsonProperty("script_container")]
    public string? ScriptContainer { get; set; }

    [JsonProperty("script_entry")]
    public string? ScriptEntry { get; set; }

    [JsonProperty("script_is_privileged")]
    public bool ScriptIsPrivileged { get; set; }

    [JsonProperty("script_install")]
    public string? ScriptInstall { get; set; }

    [JsonProperty("force_outgoing_ip")]
    public bool ForceOutgoingIp { get; set; }

    [JsonProperty("config_from")]
    public int? ConfigFrom { get; set; }

    [JsonProperty("copy_script_from")]
    public int? CopyScriptFrom { get; set; }
}

public class SpellVariableData
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("env_variable")]
    public string? EnvVariable { get; set; }

    [JsonProperty("default_value")]
    public string? DefaultValue { get; set; }

    [JsonProperty("user_viewable")]
    public bool UserViewable { get; set; }

    [JsonProperty("user_editable")]
    public bool UserEditable { get; set; }

    [JsonProperty("rules")]
    public string? Rules { get; set; }
}

