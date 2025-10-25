using Newtonsoft.Json;

namespace FeatherCli.Core.Models;

public class ApiResponse<T>
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("data")]
    public T? Data { get; set; }

    [JsonProperty("error")]
    public bool Error { get; set; }

    [JsonProperty("error_message")]
    public string? ErrorMessage { get; set; }

    [JsonProperty("error_code")]
    public string? ErrorCode { get; set; }
}

public class UserSession
{
    [JsonProperty("user_info")]
    public UserInfo? UserInfo { get; set; }

    [JsonProperty("permissions")]
    public List<string>? Permissions { get; set; }

    [JsonProperty("preferences")]
    public Dictionary<string, object>? Preferences { get; set; }

    [JsonProperty("activity")]
    public ActivityData? Activity { get; set; }

    [JsonProperty("mails")]
    public MailData? Mails { get; set; }
}

public class UserInfo
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("username")]
    public string? Username { get; set; }

    [JsonProperty("first_name")]
    public string? FirstName { get; set; }

    [JsonProperty("last_name")]
    public string? LastName { get; set; }

    [JsonProperty("email")]
    public string? Email { get; set; }

    [JsonProperty("uuid")]
    public string? Uuid { get; set; }

    [JsonProperty("avatar")]
    public string? Avatar { get; set; }

    [JsonProperty("banned")]
    public string? Banned { get; set; }

    [JsonProperty("two_fa_enabled")]
    public string? TwoFaEnabled { get; set; }

    [JsonProperty("last_seen")]
    public string? LastSeen { get; set; }

    [JsonProperty("first_seen")]
    public string? FirstSeen { get; set; }

    [JsonProperty("role_id")]
    public int RoleId { get; set; }
}

public class ActivityData
{
    [JsonProperty("count")]
    public int Count { get; set; }

    [JsonProperty("data")]
    public List<ActivityItem>? Data { get; set; }
}

public class ActivityItem
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("user_uuid")]
    public string? UserUuid { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("context")]
    public string? Context { get; set; }

    [JsonProperty("ip_address")]
    public string? IpAddress { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

public class MailData
{
    [JsonProperty("count")]
    public int Count { get; set; }

    [JsonProperty("data")]
    public List<object>? Data { get; set; }
}

public class ServerListResponse
{
    [JsonProperty("servers")]
    public List<Server>? Servers { get; set; }

    [JsonProperty("pagination")]
    public PaginationInfo? Pagination { get; set; }

    [JsonProperty("search")]
    public SearchInfo? Search { get; set; }
}

public class PaginationInfo
{
    [JsonProperty("current_page")]
    public int CurrentPage { get; set; }

    [JsonProperty("per_page")]
    public int PerPage { get; set; }

    [JsonProperty("total_records")]
    public int TotalRecords { get; set; }

    [JsonProperty("total_pages")]
    public int TotalPages { get; set; }

    [JsonProperty("has_next")]
    public bool HasNext { get; set; }

    [JsonProperty("has_prev")]
    public bool HasPrev { get; set; }

    [JsonProperty("from")]
    public int From { get; set; }

    [JsonProperty("to")]
    public int To { get; set; }
}

public class SearchInfo
{
    [JsonProperty("query")]
    public string? Query { get; set; }

    [JsonProperty("has_results")]
    public bool HasResults { get; set; }
}

public class Server
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("uuid")]
    public string? Uuid { get; set; }

    [JsonProperty("uuidShort")]
    public string? UuidShort { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("status")]
    public string? Status { get; set; }

    [JsonProperty("suspended")]
    public int Suspended { get; set; }

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
    public int? Threads { get; set; }

    [JsonProperty("oom_disabled")]
    public int OomDisabled { get; set; }

    [JsonProperty("allocation_limit")]
    public int AllocationLimit { get; set; }

    [JsonProperty("database_limit")]
    public int DatabaseLimit { get; set; }

    [JsonProperty("backup_limit")]
    public int BackupLimit { get; set; }

    [JsonProperty("is_subuser")]
    public bool IsSubuser { get; set; }

    [JsonProperty("subuser_permissions")]
    public List<string>? SubuserPermissions { get; set; }

    [JsonProperty("subuser_id")]
    public int? SubuserId { get; set; }

    [JsonProperty("node")]
    public NodeInfo? Node { get; set; }

    [JsonProperty("realm")]
    public RealmInfo? Realm { get; set; }

    [JsonProperty("spell")]
    public SpellInfo? Spell { get; set; }

    [JsonProperty("allocation")]
    public AllocationInfo? Allocation { get; set; }
}

public class NodeInfo
{
    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("maintenance_mode")]
    public int MaintenanceMode { get; set; }

    [JsonProperty("fqdn")]
    public string? Fqdn { get; set; }

    [JsonProperty("behind_proxy")]
    public int BehindProxy { get; set; }
}

public class RealmInfo
{
    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("logo")]
    public string? Logo { get; set; }
}

public class SpellInfo
{
    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("banner")]
    public string? Banner { get; set; }
}

public class AllocationInfo
{
    [JsonProperty("ip")]
    public string? Ip { get; set; }

    [JsonProperty("port")]
    public int Port { get; set; }

    [JsonProperty("ip_alias")]
    public string? IpAlias { get; set; }
}

public class CommandResponse
{
    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("command")]
    public string? Command { get; set; }
}

public class CommandRequest
{
    [JsonProperty("command")]
    public string Command { get; set; } = string.Empty;
}

public class PowerActionResponse
{
    [JsonProperty("response")]
    public List<object>? Response { get; set; }
}

public class DetailedServer
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("external_id")]
    public string? ExternalId { get; set; }

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

    [JsonProperty("suspended")]
    public int Suspended { get; set; }

    [JsonProperty("skip_scripts")]
    public int SkipScripts { get; set; }

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
    public int? Threads { get; set; }

    [JsonProperty("oom_disabled")]
    public int OomDisabled { get; set; }

    [JsonProperty("allocation_id")]
    public int AllocationId { get; set; }

    [JsonProperty("realms_id")]
    public int RealmsId { get; set; }

    [JsonProperty("spell_id")]
    public int SpellId { get; set; }

    [JsonProperty("startup")]
    public string? Startup { get; set; }

    [JsonProperty("image")]
    public string? Image { get; set; }

    [JsonProperty("allocation_limit")]
    public int AllocationLimit { get; set; }

    [JsonProperty("database_limit")]
    public int DatabaseLimit { get; set; }

    [JsonProperty("backup_limit")]
    public int BackupLimit { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }

    [JsonProperty("installed_at")]
    public string? InstalledAt { get; set; }

    [JsonProperty("last_error")]
    public string? LastError { get; set; }

    [JsonProperty("node")]
    public DetailedNodeInfo? Node { get; set; }

    [JsonProperty("realm")]
    public DetailedRealmInfo? Realm { get; set; }

    [JsonProperty("spell")]
    public DetailedSpellInfo? Spell { get; set; }

    [JsonProperty("allocation")]
    public DetailedAllocationInfo? Allocation { get; set; }

    [JsonProperty("activity")]
    public List<ActivityInfo>? Activity { get; set; }

    [JsonProperty("sftp")]
    public SftpInfo? Sftp { get; set; }

    [JsonProperty("variables")]
    public List<VariableInfo>? Variables { get; set; }
}

public class DetailedNodeInfo
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("uuid")]
    public string? Uuid { get; set; }

    [JsonProperty("public")]
    public int Public { get; set; }

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
    public int BehindProxy { get; set; }

    [JsonProperty("maintenance_mode")]
    public int MaintenanceMode { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

public class DetailedRealmInfo
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

public class DetailedSpellInfo
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("uuid")]
    public string? Uuid { get; set; }

    [JsonProperty("realm_id")]
    public int RealmId { get; set; }

    [JsonProperty("author")]
    public string? Author { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("features")]
    public List<string>? Features { get; set; }

    [JsonProperty("docker_images")]
    public Dictionary<string, string>? DockerImages { get; set; }

    [JsonProperty("file_denylist")]
    public List<string>? FileDenylist { get; set; }

    [JsonProperty("update_url")]
    public string? UpdateUrl { get; set; }

    [JsonProperty("config_files")]
    public Dictionary<string, object>? ConfigFiles { get; set; }

    [JsonProperty("config_startup")]
    public Dictionary<string, string>? ConfigStartup { get; set; }

    [JsonProperty("config_logs")]
    public List<string>? ConfigLogs { get; set; }

    [JsonProperty("config_stop")]
    public string? ConfigStop { get; set; }

    [JsonProperty("config_from")]
    public string? ConfigFrom { get; set; }

    [JsonProperty("startup")]
    public string? Startup { get; set; }

    [JsonProperty("script_container")]
    public string? ScriptContainer { get; set; }

    [JsonProperty("copy_script_from")]
    public string? CopyScriptFrom { get; set; }

    [JsonProperty("script_entry")]
    public string? ScriptEntry { get; set; }

    [JsonProperty("script_is_privileged")]
    public int ScriptIsPrivileged { get; set; }

    [JsonProperty("script_install")]
    public string? ScriptInstall { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }

    [JsonProperty("force_outgoing_ip")]
    public int ForceOutgoingIp { get; set; }

    [JsonProperty("banner")]
    public string? Banner { get; set; }
}

public class DetailedAllocationInfo
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("node_id")]
    public int NodeId { get; set; }

    [JsonProperty("ip")]
    public string? Ip { get; set; }

    [JsonProperty("ip_alias")]
    public string? IpAlias { get; set; }

    [JsonProperty("port")]
    public int Port { get; set; }

    [JsonProperty("server_id")]
    public int ServerId { get; set; }

    [JsonProperty("notes")]
    public string? Notes { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

public class ActivityInfo
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("server_id")]
    public int ServerId { get; set; }

    [JsonProperty("node_id")]
    public int NodeId { get; set; }

    [JsonProperty("user_id")]
    public int? UserId { get; set; }

    [JsonProperty("ip")]
    public string? Ip { get; set; }

    [JsonProperty("event")]
    public string? Event { get; set; }

    [JsonProperty("metadata")]
    public string? Metadata { get; set; }

    [JsonProperty("timestamp")]
    public string? Timestamp { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

public class SftpInfo
{
    [JsonProperty("host")]
    public string? Host { get; set; }

    [JsonProperty("port")]
    public int Port { get; set; }

    [JsonProperty("username")]
    public string? Username { get; set; }

    [JsonProperty("password")]
    public string? Password { get; set; }

    [JsonProperty("url")]
    public string? Url { get; set; }
}

public class VariableInfo
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("server_id")]
    public int ServerId { get; set; }

    [JsonProperty("variable_id")]
    public int VariableId { get; set; }

    [JsonProperty("variable_value")]
    public string? VariableValue { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("env_variable")]
    public string? EnvVariable { get; set; }

    [JsonProperty("default_value")]
    public string? DefaultValue { get; set; }

    [JsonProperty("user_viewable")]
    public int UserViewable { get; set; }

    [JsonProperty("user_editable")]
    public int UserEditable { get; set; }

    [JsonProperty("rules")]
    public string? Rules { get; set; }

    [JsonProperty("field_type")]
    public string? FieldType { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

public class DetailedServerResponse
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("data")]
    public DetailedServer? Data { get; set; }

    [JsonProperty("error")]
    public bool Error { get; set; }

    [JsonProperty("error_message")]
    public string? ErrorMessage { get; set; }

    [JsonProperty("error_code")]
    public string? ErrorCode { get; set; }
}

public class ReinstallServerData
{
    [JsonProperty("server")]
    public ReinstallServerInfo? Server { get; set; }
}

public class ReinstallServerInfo
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("uuid")]
    public string? Uuid { get; set; }

    [JsonProperty("uuidShort")]
    public string? UuidShort { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

public class ReinstallServerResponse
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("data")]
    public ReinstallServerData? Data { get; set; }

    [JsonProperty("error")]
    public bool Error { get; set; }

    [JsonProperty("error_message")]
    public string? ErrorMessage { get; set; }

    [JsonProperty("error_code")]
    public string? ErrorCode { get; set; }
}

public class LogsData
{
    [JsonProperty("response")]
    public LogsResponse? Response { get; set; }
}

public class LogsResponse
{
    [JsonProperty("data")]
    public List<string>? Data { get; set; }
}

public class LogsApiResponse
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("data")]
    public LogsData? Data { get; set; }

    [JsonProperty("error")]
    public bool Error { get; set; }

    [JsonProperty("error_message")]
    public string? ErrorMessage { get; set; }

    [JsonProperty("error_code")]
    public string? ErrorCode { get; set; }
}

public class InstallLogsData
{
    [JsonProperty("response")]
    public InstallLogsResponse? Response { get; set; }
}

public class InstallLogsResponse
{
    [JsonProperty("data")]
    public string? Data { get; set; }
}

public class InstallLogsApiResponse
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("data")]
    public InstallLogsData? Data { get; set; }

    [JsonProperty("error")]
    public bool Error { get; set; }

    [JsonProperty("error_message")]
    public string? ErrorMessage { get; set; }

    [JsonProperty("error_code")]
    public string? ErrorCode { get; set; }
}

public class LogUploadData
{
    [JsonProperty("id")]
    public string? Id { get; set; }

    [JsonProperty("url")]
    public string? Url { get; set; }

    [JsonProperty("raw")]
    public string? Raw { get; set; }
}

public class LogUploadResponse
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("data")]
    public LogUploadData? Data { get; set; }

    [JsonProperty("error")]
    public bool Error { get; set; }

    [JsonProperty("error_message")]
    public string? ErrorMessage { get; set; }

    [JsonProperty("error_code")]
    public string? ErrorCode { get; set; }
}
