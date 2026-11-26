using FeatherCli.Commands.Migrate.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Display;

public class EggsDisplay
{
    public void DisplayEggs(List<PterodactylEgg> eggs)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold blue]Pterodactyl Eggs Found:[/]");
        AnsiConsole.MarkupLine("=====================================");
        AnsiConsole.WriteLine();

        var totalCount = eggs.Count;
        var displayCount = Math.Min(25, totalCount);
        var remainingCount = totalCount - displayCount;

        // Create a table
        var table = new Table();
        table.AddColumn("[bold]ID[/]");
        table.AddColumn("[bold]Name[/]");
        table.AddColumn("[bold]Nest ID[/]");
        table.AddColumn("[bold]Author[/]");
        table.AddColumn("[bold]Variables[/]");

        for (int i = 0; i < displayCount; i++)
        {
            var egg = eggs[i];
            table.AddRow(
                egg.Id.ToString(),
                Markup.Escape(egg.Name ?? ""),
                egg.NestId.ToString(),
                Markup.Escape(egg.Author ?? ""),
                egg.Variables.Count.ToString()
            );
        }

        AnsiConsole.Write(table);

        if (remainingCount > 0)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[yellow]... and {remainingCount} more egg(s) not shown[/]");
        }

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine($"[green]Total eggs found: {totalCount}[/]");
    }
}

