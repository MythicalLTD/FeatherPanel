using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using FeatherCli.Core.Models;
using Spectre.Console;
using ServerModel = FeatherCli.Core.Models.Server;

namespace FeatherCli.Commands.Server.Commands;

public class ServerCommandCommand : BaseServerCommand
{
    public Command CreateCommandCommand(IServiceProvider serviceProvider)
    {
        var commandCommand = new Command("command", "Send a command to a server");
        var commandUuidOption = new Option<string?>("--uuid", "Server UUID or short UUID (will prompt if not provided)");
        var commandTextOption = new Option<string?>("--command", "Command to send to the server (will prompt if not provided)");
        commandCommand.AddOption(commandUuidOption);
        commandCommand.AddOption(commandTextOption);
        
        commandCommand.SetHandler(async (string? uuid, string? command) =>
        {
            var apiClient = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();

            if (!await ValidateConfigurationAsync(configManager, apiClient))
                return;

            // If no command provided, prompt for it interactively
            if (string.IsNullOrEmpty(command))
            {
                if (AnsiConsole.Profile.Capabilities.Interactive)
                {
                    command = AnsiConsole.Ask<string>("[blue]Enter command to send:[/]");
                    if (string.IsNullOrWhiteSpace(command))
                    {
                        AnsiConsole.MarkupLine("[yellow]No command entered. Exiting.[/]");
                        return;
                    }
                }
                else
                {
                    AnsiConsole.MarkupLine("[red]✗ Command is required. Use --command option or run in an interactive terminal.[/]");
                    return;
                }
            }

            ServerModel? server = null;
            
            if (string.IsNullOrEmpty(uuid))
            {
                server = await SelectServerInteractivelyAsync(apiClient, configManager);
                if (server == null) return;
            }
            else
            {
                server = await FindServerAsync(apiClient, uuid);
                if (server == null)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Server '{uuid}' not found.[/]");
                    return;
                }
            }

            AnsiConsole.MarkupLine($"[yellow]Sending command '{command}' to server: {server.Name}[/]");
            
            var success = await apiClient.SendServerCommandAsync(server.UuidShort ?? server.Uuid ?? "", command);
            if (success)
            {
                AnsiConsole.MarkupLine($"[green]✓ Command sent successfully to {server.Name}![/]");
            }
            else
            {
                AnsiConsole.MarkupLine($"[red]✗ Failed to send command to server {server.Name}[/]");
                AnsiConsole.MarkupLine("[yellow]Note: Server may be offline or Wings daemon may be unavailable.[/]");
            }
        }, commandUuidOption, commandTextOption);

        return commandCommand;
    }
}

