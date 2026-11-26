using FeatherCli.Commands.Migrate.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Display;

public class ServersDisplay
{
    public void DisplayServers(List<PterodactylServer> servers)
    {
        if (servers.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]No servers found[/]");
            return;
        }

        var table = new Table();
        table.AddColumn("[bold]ID[/]");
        table.AddColumn("[bold]Name[/]");
        table.AddColumn("[bold]Owner ID[/]");
        table.AddColumn("[bold]Node ID[/]");
        table.AddColumn("[bold]Nest ID[/]");
        table.AddColumn("[bold]Egg ID[/]");
        table.AddColumn("[bold]Status[/]");

        var displayCount = Math.Min(servers.Count, 25);
        for (int i = 0; i < displayCount; i++)
        {
            var server = servers[i];
            table.AddRow(
                server.Id.ToString(),
                Markup.Escape(server.Name ?? ""),
                server.OwnerId.ToString(),
                server.NodeId.ToString(),
                server.NestId.ToString(),
                server.EggId.ToString(),
                Markup.Escape(server.Status ?? "N/A")
            );
        }

        AnsiConsole.Write(table);

        if (servers.Count > 25)
        {
            AnsiConsole.MarkupLine($"[dim]... and {servers.Count - 25} more server(s)[/]");
        }
    }
}

