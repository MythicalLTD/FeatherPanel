using FeatherCli.Commands.Migrate.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Display;

public class AllocationsDisplay
{
    public void DisplayAllocations(List<PterodactylAllocation> allocations)
    {
        if (allocations.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]No allocations found[/]");
            return;
        }

        var table = new Table();
        table.AddColumn("[bold]ID[/]");
        table.AddColumn("[bold]IP[/]");
        table.AddColumn("[bold]Port[/]");
        table.AddColumn("[bold]Node ID[/]");
        table.AddColumn("[bold]Server ID[/]");
        table.AddColumn("[bold]IP Alias[/]");

        var displayCount = Math.Min(allocations.Count, 25);
        for (int i = 0; i < displayCount; i++)
        {
            var allocation = allocations[i];
            table.AddRow(
                allocation.Id.ToString(),
                Markup.Escape(allocation.Ip ?? ""),
                allocation.Port.ToString(),
                allocation.NodeId.ToString(),
                allocation.ServerId?.ToString() ?? "N/A",
                Markup.Escape(allocation.IpAlias ?? "N/A")
            );
        }

        AnsiConsole.Write(table);

        if (allocations.Count > 25)
        {
            AnsiConsole.MarkupLine($"[dim]... and {allocations.Count - 25} more allocation(s)[/]");
        }
    }
}

