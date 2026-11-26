using System.IO;
using FeatherCli.Commands.Migrate.Models;
using FeatherCli.Commands.Migrate.Utils;

namespace FeatherCli.Commands.Migrate.Services;

public class ConfigurationLoader
{
    public PterodactylConfig LoadFromEnvFile(string envFilePath)
    {
        if (!File.Exists(envFilePath))
        {
            throw new FileNotFoundException($"Environment file not found: {envFilePath}");
        }

        var envVars = EnvFileParser.ParseEnvFile(envFilePath);
        return LoadFromEnvVars(envVars);
    }

    public PterodactylConfig LoadFromAppKey(string appKey)
    {
        if (string.IsNullOrWhiteSpace(appKey))
        {
            throw new ArgumentException("APP_KEY is required", nameof(appKey));
        }

        return new PterodactylConfig
        {
            AppKey = appKey.Trim(),
            DbConnection = "mysql"
        };
    }

    public PterodactylConfig LoadFromEnvVars(Dictionary<string, string> envVars)
    {
        var mailMailer = EnvFileParser.GetValue(envVars, "MAIL_MAILER")
            ?? EnvFileParser.GetValue(envVars, "MAIL_DRIVER");
        var mailFromAddress = EnvFileParser.GetValue(envVars, "MAIL_FROM_ADDRESS")
            ?? EnvFileParser.GetValue(envVars, "MAIL_FROM");

        return new PterodactylConfig
        {
            AppKey = EnvFileParser.GetValue(envVars, "APP_KEY"),
            AppTimezone = EnvFileParser.GetValue(envVars, "APP_TIMEZONE")
                ?? EnvFileParser.GetValue(envVars, "TIMEZONE"),
            AppDebug = EnvFileParser.GetValue(envVars, "APP_DEBUG"),

            DbConnection = EnvFileParser.GetValue(envVars, "DB_CONNECTION") ?? "mysql",
            DbHost = EnvFileParser.GetValue(envVars, "DB_HOST"),
            DbPort = EnvFileParser.GetValue(envVars, "DB_PORT"),
            DbDatabase = EnvFileParser.GetValue(envVars, "DB_DATABASE"),
            DbUsername = EnvFileParser.GetValue(envVars, "DB_USERNAME"),
            DbPassword = EnvFileParser.GetValue(envVars, "DB_PASSWORD"),

            HashidsSalt = EnvFileParser.GetValue(envVars, "HASHIDS_SALT")
                ?? EnvFileParser.GetValue(envVars, "HASH_SALT"),
            HashidsLength = EnvFileParser.GetValue(envVars, "HASHIDS_LENGTH"),

            MailMailer = mailMailer,
            MailHost = EnvFileParser.GetValue(envVars, "MAIL_HOST")
                ?? EnvFileParser.GetValue(envVars, "SMTP_SERVER"),
            MailPort = EnvFileParser.GetValue(envVars, "MAIL_PORT")
                ?? EnvFileParser.GetValue(envVars, "SMTP_PORT"),
            MailUsername = EnvFileParser.GetValue(envVars, "MAIL_USERNAME")
                ?? EnvFileParser.GetValue(envVars, "SMTP_USERNAME"),
            MailPassword = EnvFileParser.GetValue(envVars, "MAIL_PASSWORD")
                ?? EnvFileParser.GetValue(envVars, "SMTP_APIKEY"),
            MailEncryption = EnvFileParser.GetValue(envVars, "MAIL_ENCRYPTION")
                ?? EnvFileParser.GetValue(envVars, "SMTP_ENCRYPTION"),
            MailFromAddress = mailFromAddress,
            MailFromName = EnvFileParser.GetValue(envVars, "MAIL_FROM_NAME")
                ?? EnvFileParser.GetValue(envVars, "APP_NAME"),

            AppServiceAuthor = EnvFileParser.GetValue(envVars, "APP_SERVICE_AUTHOR")
                ?? EnvFileParser.GetValue(envVars, "EGG_AUTHOR_EMAIL"),
            PterodactylTelemetryEnabled = EnvFileParser.GetValue(envVars, "PTERODACTYL_TELEMETRY_ENABLED")
        };
    }

    public void ApplyStagingDatabase(PterodactylConfig config, StagingDatabaseOptions staging, string databaseName)
    {
        config.DbConnection = "mysql";
        config.DbHost = staging.Host;
        config.DbPort = staging.Port;
        config.DbDatabase = databaseName;
        config.DbUsername = staging.Username;
        config.DbPassword = staging.Password;
    }
}

