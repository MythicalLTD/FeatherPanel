using FeatherCli.Commands.Migrate.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Display;

public class ConfigurationDisplay
{
    public void DisplayConfiguration(PterodactylConfig config)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold blue]Pterodactyl Configuration[/]");
        AnsiConsole.MarkupLine("=====================================");
        AnsiConsole.WriteLine();

        // Application settings
        AnsiConsole.MarkupLine("[bold]Application Settings:[/]");
        AnsiConsole.MarkupLine($"  APP_KEY: [dim]{MaskSensitiveValue(config.AppKey)}[/]");
        AnsiConsole.MarkupLine($"  APP_TIMEZONE: [green]{config.AppTimezone ?? "Not set"}[/]");
        AnsiConsole.WriteLine();

        // Database settings
        AnsiConsole.MarkupLine("[bold]Database Settings:[/]");
        AnsiConsole.MarkupLine($"  DB_CONNECTION: [green]{config.DbConnection ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  DB_HOST: [green]{config.DbHost ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  DB_PORT: [green]{config.DbPort ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  DB_DATABASE: [green]{config.DbDatabase ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  DB_USERNAME: [green]{config.DbUsername ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  DB_PASSWORD: [dim]{MaskSensitiveValue(config.DbPassword)}[/]");
        AnsiConsole.WriteLine();

        // Hashids settings
        AnsiConsole.MarkupLine("[bold]Hashids Settings:[/]");
        AnsiConsole.MarkupLine($"  HASHIDS_SALT: [dim]{MaskSensitiveValue(config.HashidsSalt)}[/]");
        AnsiConsole.MarkupLine($"  HASHIDS_LENGTH: [green]{config.HashidsLength ?? "Not set"}[/]");
        AnsiConsole.WriteLine();

        // Mail settings
        AnsiConsole.MarkupLine("[bold]Mail Settings:[/]");
        AnsiConsole.MarkupLine($"  MAIL_MAILER: [green]{config.MailMailer ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  MAIL_HOST: [green]{config.MailHost ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  MAIL_PORT: [green]{config.MailPort ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  MAIL_USERNAME: [green]{config.MailUsername ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  MAIL_PASSWORD: [dim]{MaskSensitiveValue(config.MailPassword)}[/]");
        AnsiConsole.MarkupLine($"  MAIL_ENCRYPTION: [green]{config.MailEncryption ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  MAIL_FROM_ADDRESS: [green]{config.MailFromAddress ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  MAIL_FROM_NAME: [green]{config.MailFromName ?? "Not set"}[/]");
        AnsiConsole.WriteLine();

        // Service settings
        AnsiConsole.MarkupLine("[bold]Service Settings:[/]");
        AnsiConsole.MarkupLine($"  APP_SERVICE_AUTHOR: [green]{config.AppServiceAuthor ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  PTERODACTYL_TELEMETRY_ENABLED: [green]{config.PterodactylTelemetryEnabled ?? "Not set"}[/]");
    }

    private string MaskSensitiveValue(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return "[dim]Not set[/]";
        }

        // Mask sensitive values (show first 4 and last 4 characters if long enough)
        if (value.Length > 8)
        {
            return $"{value.Substring(0, 4)}...{value.Substring(value.Length - 4)}";
        }

        // For short values, just show asterisks
        return new string('*', value.Length);
    }
}

