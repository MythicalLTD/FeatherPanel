using FeatherCli.Commands.Migrate.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Display;

public class SettingsPreviewDisplay
{
    public void DisplaySettingsPreview(SettingsUpdateRequest request)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold blue]Settings Preview - What will be imported:[/]");
        AnsiConsole.MarkupLine("=====================================");
        AnsiConsole.WriteLine();

        // Application Settings
        AnsiConsole.MarkupLine("[bold]Application Settings:[/]");
        AnsiConsole.MarkupLine($"  App Name: [green]{request.AppName ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  App Timezone: [green]{request.AppTimezone ?? "Not set"}[/]");
        AnsiConsole.MarkupLine($"  Developer Mode: [green]{request.AppDeveloperMode}[/]");
        AnsiConsole.WriteLine();

        // Security Settings
        AnsiConsole.MarkupLine("[bold]Security Settings:[/]");
        AnsiConsole.MarkupLine($"  Telemetry: [green]{request.Telemetry}[/]");
        AnsiConsole.MarkupLine($"  Require 2FA for Admins: [green]{request.RequireTwoFaAdmins}[/]");
        AnsiConsole.WriteLine();

        // SMTP Settings
        AnsiConsole.MarkupLine("[bold]SMTP Settings:[/]");
        AnsiConsole.MarkupLine($"  SMTP Enabled: [green]{request.SmtpEnabled}[/]");
        
        if (request.SmtpEnabled == "true")
        {
            AnsiConsole.MarkupLine($"  SMTP Host: [green]{request.SmtpHost ?? "Not set"}[/]");
            AnsiConsole.MarkupLine($"  SMTP Port: [green]{request.SmtpPort ?? "Not set"}[/]");
            AnsiConsole.MarkupLine($"  SMTP Username: [green]{request.SmtpUsername ?? "Not set"}[/]");
            AnsiConsole.MarkupLine($"  SMTP Password: [dim]{MaskPassword(request.SmtpPassword)}[/]");
            AnsiConsole.MarkupLine($"  SMTP Encryption: [green]{request.SmtpEncryption ?? "Not set"}[/]");
            AnsiConsole.MarkupLine($"  SMTP From: [green]{request.SmtpFrom ?? "Not set"}[/]");
        }
        else
        {
            AnsiConsole.MarkupLine("[dim]  SMTP is disabled[/]");
        }
        
        AnsiConsole.WriteLine();
    }

    private string MaskPassword(string? password)
    {
        if (string.IsNullOrEmpty(password))
        {
            return "[dim]Not set[/]";
        }
        return new string('*', Math.Min(password.Length, 20));
    }
}

