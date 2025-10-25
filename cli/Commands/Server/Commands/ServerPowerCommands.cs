using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using FeatherCli.Core.Models;
using Spectre.Console;
using ServerModel = FeatherCli.Core.Models.Server;

namespace FeatherCli.Commands.Server.Commands;

public class ServerPowerCommands : BaseServerCommand
{
    public Command CreateStartCommand(IServiceProvider serviceProvider)
    {
        var startCommand = new Command("start", "Start a game server");
        var startUuidOption = new Option<string?>("--uuid", "Server UUID or short UUID (will prompt if not provided)");
        startCommand.AddOption(startUuidOption);
        
        startCommand.SetHandler(async (string? uuid) =>
        {
            var apiClient = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();

            if (!await ValidateConfigurationAsync(configManager, apiClient))
                return;

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

            AnsiConsole.MarkupLine($"[yellow]Starting server: {server.Name}[/]");
            
            var success = await apiClient.StartServerAsync(server.UuidShort ?? server.Uuid ?? "");
            if (success)
            {
                AnsiConsole.MarkupLine($"[green]✓ Server {server.Name} started successfully![/]");
            }
            else
            {
                AnsiConsole.MarkupLine($"[red]✗ Failed to start server {server.Name}[/]");
            }
        }, startUuidOption);

        return startCommand;
    }

    public Command CreateStopCommand(IServiceProvider serviceProvider)
    {
        var stopCommand = new Command("stop", "Stop a game server");
        var stopUuidOption = new Option<string?>("--uuid", "Server UUID or short UUID (will prompt if not provided)");
        stopCommand.AddOption(stopUuidOption);
        
        stopCommand.SetHandler(async (string? uuid) =>
        {
            var apiClient = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();

            if (!await ValidateConfigurationAsync(configManager, apiClient))
                return;

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

            AnsiConsole.MarkupLine($"[yellow]Stopping server: {server.Name}[/]");
            
            var success = await apiClient.StopServerAsync(server.UuidShort ?? server.Uuid ?? "");
            if (success)
            {
                AnsiConsole.MarkupLine($"[green]✓ Server {server.Name} stopped successfully![/]");
            }
            else
            {
                AnsiConsole.MarkupLine($"[red]✗ Failed to stop server {server.Name}[/]");
            }
        }, stopUuidOption);

        return stopCommand;
    }

    public Command CreateRestartCommand(IServiceProvider serviceProvider)
    {
        var restartCommand = new Command("restart", "Restart a game server");
        var restartUuidOption = new Option<string?>("--uuid", "Server UUID or short UUID (will prompt if not provided)");
        restartCommand.AddOption(restartUuidOption);
        
        restartCommand.SetHandler(async (string? uuid) =>
        {
            var apiClient = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();

            if (!await ValidateConfigurationAsync(configManager, apiClient))
                return;

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

            AnsiConsole.MarkupLine($"[yellow]Restarting server: {server.Name}[/]");
            
            var success = await apiClient.RestartServerAsync(server.UuidShort ?? server.Uuid ?? "");
            if (success)
            {
                AnsiConsole.MarkupLine($"[green]✓ Server {server.Name} restarted successfully![/]");
            }
            else
            {
                AnsiConsole.MarkupLine($"[red]✗ Failed to restart server {server.Name}[/]");
            }
        }, restartUuidOption);

        return restartCommand;
    }

    public Command CreateKillCommand(IServiceProvider serviceProvider)
    {
        var killCommand = new Command("kill", "Force kill a game server");
        var killUuidOption = new Option<string?>("--uuid", "Server UUID or short UUID (will prompt if not provided)");
        killCommand.AddOption(killUuidOption);
        
        killCommand.SetHandler(async (string? uuid) =>
        {
            var apiClient = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();

            if (!await ValidateConfigurationAsync(configManager, apiClient))
                return;

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

            // Confirm kill action
            if (AnsiConsole.Profile.Capabilities.Interactive)
            {
                if (!AnsiConsole.Confirm($"[red]Are you sure you want to force kill server '{server.Name}'? This action cannot be undone![/]"))
                {
                    AnsiConsole.MarkupLine("[yellow]Kill action cancelled.[/]");
                    return;
                }
            }
            else
            {
                AnsiConsole.MarkupLine("[red]⚠️  Force kill action requested in non-interactive mode.[/]");
                AnsiConsole.MarkupLine("[yellow]To prevent accidental kills, please run this command in an interactive terminal.[/]");
                return;
            }

            AnsiConsole.MarkupLine($"[red]Force killing server: {server.Name}[/]");
            
            var success = await apiClient.KillServerAsync(server.UuidShort ?? server.Uuid ?? "");
            if (success)
            {
                AnsiConsole.MarkupLine($"[green]✓ Server {server.Name} killed successfully![/]");
            }
            else
            {
                AnsiConsole.MarkupLine($"[red]✗ Failed to kill server {server.Name}[/]");
            }
        }, killUuidOption);

        return killCommand;
    }
}

