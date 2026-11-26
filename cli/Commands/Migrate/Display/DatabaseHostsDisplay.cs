using FeatherCli.Commands.Migrate.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Display;

public class DatabaseHostsDisplay
{
    public void DisplayDatabaseHosts(List<PterodactylDatabaseHost> hosts)
    {
        if (hosts.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]No database hosts found[/]");
            return;
        }

        var table = new Table();
        table.AddColumn("[bold]ID[/]");
        table.AddColumn("[bold]Name[/]");
        table.AddColumn("[bold]Host[/]");
        table.AddColumn("[bold]Port[/]");
        table.AddColumn("[bold]Username[/]");
        table.AddColumn("[bold]Node ID[/]");

        var displayCount = Math.Min(hosts.Count, 25);
        for (int i = 0; i < displayCount; i++)
        {
            var host = hosts[i];
            table.AddRow(
                host.Id.ToString(),
                Markup.Escape(host.Name ?? ""),
                Markup.Escape(host.Host ?? ""),
                host.Port.ToString(),
                Markup.Escape(host.Username ?? ""),
                host.NodeId?.ToString() ?? "N/A"
            );
        }

        AnsiConsole.Write(table);

        if (hosts.Count > 25)
        {
            AnsiConsole.MarkupLine($"[dim]... and {hosts.Count - 25} more database host(s)[/]");
        }
    }
}

