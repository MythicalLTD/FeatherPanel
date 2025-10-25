using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using FeatherCli.Core.Models;
using Spectre.Console;
using ServerModel = FeatherCli.Core.Models.Server;

namespace FeatherCli.Commands.Server.Commands;

public abstract class BaseServerCommand
{
    protected async Task<ServerModel?> SelectServerInteractivelyAsync(FeatherPanelApiClient apiClient, ConfigManager configManager, string? searchTerm = null)
    {
        var serverResponse = await apiClient.GetServersAsync(1, 1000, searchTerm);
        if (serverResponse?.Servers == null || !serverResponse.Servers.Any())
        {
            AnsiConsole.MarkupLine("[yellow]No servers found.[/]");
            return null;
        }

        var servers = serverResponse.Servers.ToList();
        
        // If only one server, return it automatically
        if (servers.Count == 1)
        {
            AnsiConsole.MarkupLine($"[blue]Selected server: {servers[0].Name}[/]");
            return servers[0];
        }

        // Check if terminal is interactive
        if (!AnsiConsole.Profile.Capabilities.Interactive)
        {
            AnsiConsole.MarkupLine("[red]✗ Interactive server selection is not available in non-interactive terminals.[/]");
            AnsiConsole.MarkupLine("[yellow]Please provide a server UUID using --uuid option or run in an interactive terminal.[/]");
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[blue]Available servers:[/]");
            foreach (var server in servers)
            {
                AnsiConsole.MarkupLine($"  • {server.Name} ({server.UuidShort}) - {server.Status ?? "Unknown"}");
            }
            return null;
        }

        // Create selection prompt
        var selection = AnsiConsole.Prompt(
            new SelectionPrompt<ServerModel>()
                .Title("Select a server:")
                .PageSize(10)
                .AddChoices(servers)
                .UseConverter(server => $"{server.Name} ({server.UuidShort}) - {server.Status ?? "Unknown"}")
        );

        return selection;
    }

    protected async Task<ServerModel?> FindServerAsync(FeatherPanelApiClient apiClient, string uuid)
    {
        var serverResponse = await apiClient.GetServersAsync(1, 1000);
        if (serverResponse?.Servers != null)
        {
            return serverResponse.Servers.FirstOrDefault(s => 
                s.Uuid == uuid || s.UuidShort == uuid || s.Name?.ToLower().Contains(uuid.ToLower()) == true);
        }
        return null;
    }

    protected async Task<bool> ValidateConfigurationAsync(ConfigManager configManager, FeatherPanelApiClient apiClient)
    {
        if (!await configManager.IsConfiguredAsync())
        {
            AnsiConsole.MarkupLine("[red]✗ Configuration not found. Please run 'feathercli config setup' first.[/]");
            return false;
        }

        if (!await apiClient.ValidateConnectionAsync())
        {
            AnsiConsole.MarkupLine("[red]✗ Failed to connect to FeatherPanel API. Please check your configuration.[/]");
            return false;
        }

        return true;
    }
}

