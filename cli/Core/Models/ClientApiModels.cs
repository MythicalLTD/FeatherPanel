using Newtonsoft.Json;

namespace FeatherCli.Core.Models;

public class PaginatedListResponse<T>
{
    [JsonProperty("data")]
    public List<T>? Data { get; set; }

    [JsonProperty("pagination")]
    public PaginationInfo? Pagination { get; set; }
}

public class ServerBackup
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("server_id")]
    public int ServerId { get; set; }

    [JsonProperty("uuid")]
    public string? Uuid { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("ignored_files")]
    public string? IgnoredFiles { get; set; }

    [JsonProperty("disk")]
    public string? Disk { get; set; }

    [JsonProperty("is_successful")]
    public int IsSuccessful { get; set; }

    [JsonProperty("is_locked")]
    public int IsLocked { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

public class BackupCreateRequest
{
    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("ignore")]
    public string? Ignore { get; set; }
}

public class BackupCreateResult
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("uuid")]
    public string? Uuid { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("adapter")]
    public string? Adapter { get; set; }
}

public class BackupDownloadResult
{
    [JsonProperty("download_url")]
    public string? DownloadUrl { get; set; }

    [JsonProperty("expires_in")]
    public int ExpiresIn { get; set; }
}

public class BackupRestoreRequest
{
    [JsonProperty("truncate_directory")]
    public bool? TruncateDirectory { get; set; }
}

public class ServerFileItem
{
    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("type")]
    public string? Type { get; set; }

    [JsonProperty("size")]
    public long? Size { get; set; }

    [JsonProperty("directory_size")]
    public long? DirectorySize { get; set; }

    [JsonProperty("permissions")]
    public string? Permissions { get; set; }

    [JsonProperty("modified_at")]
    public string? ModifiedAt { get; set; }

    [JsonProperty("path")]
    public string? Path { get; set; }
}

public class ServerFilesResponse
{
    [JsonProperty("contents")]
    public List<ServerFileItem>? Contents { get; set; }
}

public class FileOperationRequest
{
    [JsonProperty("files")]
    public List<string> Files { get; set; } = new();

    [JsonProperty("root")]
    public string Root { get; set; } = "/";
}

public class ServerDatabase
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("server_id")]
    public int ServerId { get; set; }

    [JsonProperty("database_host_id")]
    public int DatabaseHostId { get; set; }

    [JsonProperty("database")]
    public string? Database { get; set; }

    [JsonProperty("username")]
    public string? Username { get; set; }

    [JsonProperty("password")]
    public string? Password { get; set; }

    [JsonProperty("remote")]
    public string? Remote { get; set; }

    [JsonProperty("max_connections")]
    public int MaxConnections { get; set; }

    [JsonProperty("database_host_name")]
    public string? DatabaseHostName { get; set; }

    [JsonProperty("database_host")]
    public string? DatabaseHost { get; set; }

    [JsonProperty("database_port")]
    public int? DatabasePort { get; set; }

    [JsonProperty("database_type")]
    public string? DatabaseType { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

public class DatabaseHostInfo
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("database_type")]
    public string? DatabaseType { get; set; }

    [JsonProperty("database_host")]
    public string? DatabaseHost { get; set; }

    [JsonProperty("database_port")]
    public int DatabasePort { get; set; }
}

public class DatabaseCreateRequest
{
    [JsonProperty("database_host_id")]
    public int DatabaseHostId { get; set; }

    [JsonProperty("database_name")]
    public string DatabaseName { get; set; } = "";

    [JsonProperty("remote")]
    public string? Remote { get; set; }

    [JsonProperty("max_connections")]
    public int? MaxConnections { get; set; }
}

public class DatabaseCreateResult
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("database_name")]
    public string? DatabaseName { get; set; }

    [JsonProperty("username")]
    public string? Username { get; set; }

    [JsonProperty("password")]
    public string? Password { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }
}

public class ServerSchedule
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("server_id")]
    public int ServerId { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("cron_day_of_week")]
    public string? CronDayOfWeek { get; set; }

    [JsonProperty("cron_month")]
    public string? CronMonth { get; set; }

    [JsonProperty("cron_day_of_month")]
    public string? CronDayOfMonth { get; set; }

    [JsonProperty("cron_hour")]
    public string? CronHour { get; set; }

    [JsonProperty("cron_minute")]
    public string? CronMinute { get; set; }

    [JsonProperty("timezone")]
    public string? Timezone { get; set; }

    [JsonProperty("is_active")]
    public bool IsActive { get; set; }

    [JsonProperty("is_processing")]
    public bool IsProcessing { get; set; }

    [JsonProperty("only_when_online")]
    public bool OnlyWhenOnline { get; set; }

    [JsonProperty("next_run_at")]
    public string? NextRunAt { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

public class ScheduleCreateRequest
{
    [JsonProperty("name")]
    public string Name { get; set; } = "";

    [JsonProperty("cron_day_of_week")]
    public string CronDayOfWeek { get; set; } = "*";

    [JsonProperty("cron_month")]
    public string CronMonth { get; set; } = "*";

    [JsonProperty("cron_day_of_month")]
    public string CronDayOfMonth { get; set; } = "*";

    [JsonProperty("cron_hour")]
    public string CronHour { get; set; } = "*";

    [JsonProperty("cron_minute")]
    public string CronMinute { get; set; } = "0";

    [JsonProperty("timezone")]
    public string? Timezone { get; set; }

    [JsonProperty("is_active")]
    public bool? IsActive { get; set; }

    [JsonProperty("only_when_online")]
    public bool? OnlyWhenOnline { get; set; }
}

public class ScheduleToggleResult
{
    [JsonProperty("is_active")]
    public bool IsActive { get; set; }

    [JsonProperty("status")]
    public string? Status { get; set; }
}

public class UserSshKey
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("user_id")]
    public int UserId { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("public_key")]
    public string? PublicKey { get; set; }

    [JsonProperty("fingerprint")]
    public string? Fingerprint { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }

    [JsonProperty("deleted_at")]
    public string? DeletedAt { get; set; }
}

public class SshKeyListResponse
{
    [JsonProperty("ssh_keys")]
    public List<UserSshKey>? SshKeys { get; set; }

    [JsonProperty("pagination")]
    public PaginationInfo? Pagination { get; set; }
}

public class SshKeyCreateRequest
{
    [JsonProperty("name")]
    public string Name { get; set; } = "";

    [JsonProperty("public_key")]
    public string PublicKey { get; set; } = "";
}

public class UserNotification
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("title")]
    public string? Title { get; set; }

    [JsonProperty("message_markdown")]
    public string? MessageMarkdown { get; set; }

    [JsonProperty("type")]
    public string? Type { get; set; }

    [JsonProperty("is_dismissible")]
    public bool IsDismissible { get; set; }

    [JsonProperty("is_sticky")]
    public bool IsSticky { get; set; }

    [JsonProperty("created_at")]
    public string? CreatedAt { get; set; }

    [JsonProperty("updated_at")]
    public string? UpdatedAt { get; set; }
}

public class NotificationsResponse
{
    [JsonProperty("notifications")]
    public List<UserNotification>? Notifications { get; set; }
}

public class MessageResponse
{
    [JsonProperty("message")]
    public string? Message { get; set; }
}
