using FeatherCli.Commands.Migrate.Models;
using FeatherCli.Commands.Migrate.Services;

namespace FeatherCli.Commands.Migrate.Services;

public class SettingsMigrationService
{
    private readonly PterodactylDatabaseService _dbService;

    public SettingsMigrationService(PterodactylDatabaseService dbService)
    {
        _dbService = dbService;
    }

    public async Task<SettingsUpdateRequest> PrepareSettingsAsync(PterodactylConfig config)
    {
        var request = new SettingsUpdateRequest();

        // Get app name from database
        var appName = await _dbService.GetSettingValueAsync(config, "settings::app:name");
        request.AppName = appName;

        // Telemetry from env (required field - default to false if not set)
        var telemetryEnabled = config.PterodactylTelemetryEnabled;
        if (!string.IsNullOrEmpty(telemetryEnabled))
        {
            request.Telemetry = (telemetryEnabled.Equals("true", StringComparison.OrdinalIgnoreCase) ||
                                telemetryEnabled.Equals("1", StringComparison.OrdinalIgnoreCase)) ? "true" : "false";
        }
        else
        {
            // Default to false if not specified
            request.Telemetry = "false";
        }

        // Require 2FA for admins from database - default to false if not set
        var twoFaRequired = await _dbService.GetSettingValueAsync(config, "settings::pterodactyl:auth:2fa_required");
        if (!string.IsNullOrEmpty(twoFaRequired))
        {
            request.RequireTwoFaAdmins = twoFaRequired.Equals("1", StringComparison.OrdinalIgnoreCase) ? "true" : "false";
        }
        else
        {
            // Default to false if not specified
            request.RequireTwoFaAdmins = "false";
        }

        // Developer mode from env (APP_DEBUG) - default to false if not set
        if (!string.IsNullOrEmpty(config.AppDebug))
        {
            request.AppDeveloperMode = (config.AppDebug.Equals("true", StringComparison.OrdinalIgnoreCase) ||
                                       config.AppDebug.Equals("1", StringComparison.OrdinalIgnoreCase)) ? "true" : "false";
        }
        else
        {
            // Default to false if not specified
            request.AppDeveloperMode = "false";
        }

        // Timezone from env
        request.AppTimezone = config.AppTimezone;

        // SMTP settings - only set if SMTP is enabled and configured
        var mailHost = config.MailHost;
        if (!string.IsNullOrEmpty(mailHost) && !mailHost.Equals("smtp.example.com", StringComparison.OrdinalIgnoreCase))
        {
            request.SmtpEnabled = "true";
            request.SmtpHost = mailHost;
            request.SmtpPort = config.MailPort;
            request.SmtpUsername = config.MailUsername;
            request.SmtpPassword = config.MailPassword;
            request.SmtpEncryption = config.MailEncryption;
            request.SmtpFrom = config.MailFromAddress;
        }
        else
        {
            request.SmtpEnabled = "false";
        }

        return request;
    }
}

