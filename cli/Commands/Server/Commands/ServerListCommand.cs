using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using Spectre.Console;

namespace FeatherCli.Commands.Server.Commands;

public class ServerListCommand : BaseServerCommand
{
    public Command CreateCommand(IServiceProvider serviceProvider)
    {
        var listCommand = new Command("list", "List all servers");
        var pageOption = new Option<int>("--page", () => 1, "Page number for pagination");
        var limitOption = new Option<int>("--limit", () => 10, "Number of servers per page");
        var searchOption = new Option<string?>("--search", "Search term to filter servers by name or description");
        var allOption = new Option<bool>("--all", "Show all servers (ignores pagination)");
        
        listCommand.AddOption(pageOption);
        listCommand.AddOption(limitOption);
        listCommand.AddOption(searchOption);
        listCommand.AddOption(allOption);
        
        listCommand.SetHandler(async (int page, int limit, string? search, bool all) =>
        {
            var apiClient = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();

            if (!await ValidateConfigurationAsync(configManager, apiClient))
                return;

            // Adjust parameters for "all" option
            if (all)
            {
                page = 1;
                limit = 1000; // Large limit to get all servers
            }

            var serverResponse = await apiClient.GetServersAsync(page, limit, search);
            if (serverResponse?.Servers == null || !serverResponse.Servers.Any())
            {
                if (!string.IsNullOrEmpty(search))
                {
                    AnsiConsole.MarkupLine($"[yellow]No servers found matching '{search}'.[/]");
                }
                else
                {
                    AnsiConsole.MarkupLine("[yellow]No servers found.[/]");
                }
                return;
            }

            // Display search info if searching
            if (!string.IsNullOrEmpty(search))
            {
                AnsiConsole.MarkupLine($"[blue]Search results for: '{search}'[/]");
                AnsiConsole.WriteLine();
            }

            // Create table
            var table = new Table();
            table.AddColumn("Name");
            table.AddColumn("UUID");
            table.AddColumn("Status");
            table.AddColumn("Memory");
            table.AddColumn("Disk");
            table.AddColumn("Node");
            table.AddColumn("Realm");
            table.AddColumn("Spell");

            foreach (var server in serverResponse.Servers)
            {
                var statusColor = server.Status?.ToLower() switch
                {
                    "running" => "green",
                    "stopped" => "red",
                    "starting" => "yellow",
                    "stopping" => "orange",
                    "offline" => "red",
                    _ => "white"
                };

                var statusText = server.Status ?? "Unknown";
                if (server.Suspended > 0)
                {
                    statusText += " [red](Suspended)[/]";
                }

                table.AddRow(
                    server.Name ?? "Unknown",
                    server.UuidShort ?? server.Uuid ?? "Unknown",
                    $"[{statusColor}]{statusText}[/]",
                    $"{server.Memory}MB",
                    $"{server.Disk}MB",
                    server.Node?.Name ?? "Unknown",
                    server.Realm?.Name ?? "Unknown",
                    server.Spell?.Name ?? "Unknown"
                );
            }

            AnsiConsole.Write(table);

            // Display pagination info
            if (serverResponse.Pagination != null && !all)
            {
                AnsiConsole.WriteLine();
                AnsiConsole.MarkupLine($"[dim]Page {serverResponse.Pagination.CurrentPage} of {serverResponse.Pagination.TotalPages} ({serverResponse.Pagination.TotalRecords} total servers)[/]");
                
                if (serverResponse.Pagination.HasNext || serverResponse.Pagination.HasPrev)
                {
                    AnsiConsole.MarkupLine("[dim]Use --page and --limit options to navigate pages[/]");
                }
            }
        }, pageOption, limitOption, searchOption, allOption);

        return listCommand;
    }
}

