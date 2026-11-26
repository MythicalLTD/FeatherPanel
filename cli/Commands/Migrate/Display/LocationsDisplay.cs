using FeatherCli.Commands.Migrate.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Display;

public class LocationsDisplay
{
    public void DisplayLocations(List<PterodactylLocation> locations)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold blue]Pterodactyl Locations Found:[/]");
        AnsiConsole.MarkupLine("=====================================");
        AnsiConsole.WriteLine();

        var totalCount = locations.Count;
        var displayCount = Math.Min(25, totalCount);
        var remainingCount = totalCount - displayCount;

        // Create a table
        var table = new Table();
        table.AddColumn("[bold]ID[/]");
        table.AddColumn("[bold]Short[/]");
        table.AddColumn("[bold]Long[/]");
        table.AddColumn("[bold]Created At[/]");

        for (int i = 0; i < displayCount; i++)
        {
            var location = locations[i];
            table.AddRow(
                location.Id.ToString(),
                Markup.Escape(location.Short ?? ""),
                location.Long != null ? Markup.Escape(location.Long) : "[dim]NULL[/]",
                location.CreatedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "[dim]NULL[/]"
            );
        }

        AnsiConsole.Write(table);

        if (remainingCount > 0)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[yellow]... and {remainingCount} more location(s) not shown[/]");
        }

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine($"[green]Total locations found: {totalCount}[/]");
    }
}

