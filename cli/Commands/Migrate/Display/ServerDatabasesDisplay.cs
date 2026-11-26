using Spectre.Console;
using FeatherCli.Commands.Migrate.Models;

namespace FeatherCli.Commands.Migrate.Display;

public static class ServerDatabasesDisplay
{
    public static void DisplayServerDatabases(List<PterodactylServerDatabase> databases)
    {
        if (databases.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]No server databases found in Pterodactyl database.[/]");
            return;
        }

        var table = new Table();
        table.AddColumn("ID");
        table.AddColumn("Server ID");
        table.AddColumn("Host ID");
        table.AddColumn("Database");
        table.AddColumn("Username");

        var displayCount = Math.Min(25, databases.Count);
        for (int i = 0; i < displayCount; i++)
        {
            var db = databases[i];
            table.AddRow(
                db.Id.ToString(),
                db.ServerId.ToString(),
                db.DatabaseHostId.ToString(),
                Markup.Escape(db.Database ?? ""),
                Markup.Escape(db.Username ?? "")
            );
        }

        AnsiConsole.Write(table);

        if (databases.Count > 25)
        {
            AnsiConsole.MarkupLine($"[dim]... and {databases.Count - 25} more server database(s)[/]");
        }
    }
}

