using Spectre.Console;
using FeatherCli.Commands.Migrate.Models;

namespace FeatherCli.Commands.Migrate.Display;

public static class BackupsDisplay
{
    public static void DisplayBackups(List<PterodactylBackup> backups)
    {
        if (backups.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]No backups found in Pterodactyl database.[/]");
            return;
        }

        var table = new Table();
        table.AddColumn("ID");
        table.AddColumn("Server ID");
        table.AddColumn("Name");
        table.AddColumn("UUID");
        table.AddColumn("Size (MB)");
        table.AddColumn("Successful");

        var displayCount = Math.Min(25, backups.Count);
        for (int i = 0; i < displayCount; i++)
        {
            var backup = backups[i];
            var sizeMb = backup.Bytes / (1024.0 * 1024.0);
            var nameDisplay = backup.Name.Length > 30 ? backup.Name.Substring(0, 27) + "..." : backup.Name;
            table.AddRow(
                backup.Id.ToString(),
                backup.ServerId.ToString(),
                Markup.Escape(nameDisplay ?? ""),
                Markup.Escape(backup.Uuid.Substring(0, 8) + "..."),
                $"{sizeMb:F2}",
                backup.IsSuccessful ? "✓" : "✗"
            );
        }

        AnsiConsole.Write(table);

        if (backups.Count > 25)
        {
            AnsiConsole.MarkupLine($"[dim]... and {backups.Count - 25} more backup(s)[/]");
        }
    }
}

