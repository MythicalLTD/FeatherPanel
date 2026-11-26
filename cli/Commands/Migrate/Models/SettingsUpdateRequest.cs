using Newtonsoft.Json;

namespace FeatherCli.Commands.Migrate.Models;

public class SettingsUpdateRequest
{
    [JsonProperty("app_name")]
    public string? AppName { get; set; }

    [JsonProperty("telemetry")]
    public string Telemetry { get; set; } = "false";

    [JsonProperty("require_two_fa_admins")]
    public string RequireTwoFaAdmins { get; set; } = "false";

    [JsonProperty("app_developer_mode")]
    public string AppDeveloperMode { get; set; } = "false";

    [JsonProperty("app_timezone")]
    public string? AppTimezone { get; set; }

    [JsonProperty("smtp_enabled")]
    public string SmtpEnabled { get; set; } = "false";

    [JsonProperty("smtp_host")]
    public string? SmtpHost { get; set; }

    [JsonProperty("smtp_port")]
    public string? SmtpPort { get; set; }

    [JsonProperty("smtp_user")]
    public string? SmtpUsername { get; set; }

    [JsonProperty("smtp_pass")]
    public string? SmtpPassword { get; set; }

    [JsonProperty("smtp_encryption")]
    public string? SmtpEncryption { get; set; }

    [JsonProperty("smtp_from")]
    public string? SmtpFrom { get; set; }
}

