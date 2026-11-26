using FeatherCli.Commands.Migrate.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Display;

public class NestsDisplay
{
    public void DisplayNests(List<PterodactylNest> nests)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold blue]Pterodactyl Nests Found:[/]");
        AnsiConsole.MarkupLine("=====================================");
        AnsiConsole.WriteLine();

        var totalCount = nests.Count;
        var displayCount = Math.Min(25, totalCount);
        var remainingCount = totalCount - displayCount;

        // Create a table
        var table = new Table();
        table.AddColumn("[bold]ID[/]");
        table.AddColumn("[bold]Name[/]");
        table.AddColumn("[bold]Author[/]");
        table.AddColumn("[bold]Description[/]");
        table.AddColumn("[bold]Created At[/]");

        for (int i = 0; i < displayCount; i++)
        {
            var nest = nests[i];
            table.AddRow(
                nest.Id.ToString(),
                Markup.Escape(nest.Name ?? ""),
                Markup.Escape(nest.Author ?? ""),
                nest.Description != null ? Markup.Escape(nest.Description) : "[dim]NULL[/]",
                nest.CreatedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "[dim]NULL[/]"
            );
        }

        AnsiConsole.Write(table);

        if (remainingCount > 0)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[yellow]... and {remainingCount} more nest(s) not shown[/]");
        }

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine($"[green]Total nests found: {totalCount}[/]");
    }
}

