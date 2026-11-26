using FeatherCli.Commands.Migrate.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Display;

public class NodesDisplay
{
    public void DisplayNodes(List<PterodactylNode> nodes)
    {
        if (nodes.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]No nodes found[/]");
            return;
        }

        var table = new Table();
        table.AddColumn("[bold]ID[/]");
        table.AddColumn("[bold]Name[/]");
        table.AddColumn("[bold]FQDN[/]");
        table.AddColumn("[bold]Location ID[/]");
        table.AddColumn("[bold]Memory[/]");
        table.AddColumn("[bold]Disk[/]");

        var displayCount = Math.Min(nodes.Count, 25);
        for (int i = 0; i < displayCount; i++)
        {
            var node = nodes[i];
            table.AddRow(
                node.Id.ToString(),
                Markup.Escape(node.Name ?? ""),
                Markup.Escape(node.Fqdn ?? ""),
                node.LocationId.ToString(),
                $"{node.Memory} MB",
                $"{node.Disk} MB"
            );
        }

        AnsiConsole.Write(table);

        if (nodes.Count > 25)
        {
            AnsiConsole.MarkupLine($"[dim]... and {nodes.Count - 25} more node(s)[/]");
        }
    }
}

