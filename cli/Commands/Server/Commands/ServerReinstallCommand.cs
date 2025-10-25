using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using FeatherCli.Core.Models;
using Spectre.Console;
using ServerModel = FeatherCli.Core.Models.Server;

namespace FeatherCli.Commands.Server.Commands;

public class ServerReinstallCommand : BaseServerCommand
{
    public Command CreateReinstallCommand(IServiceProvider serviceProvider)
    {
        var reinstallCommand = new Command("reinstall", "Reinstall a server (resets to initial state)");
        var reinstallUuidOption = new Option<string?>("--uuid", "Server UUID or short UUID (will prompt if not provided)");
        var reinstallForceOption = new Option<bool>("--force", "Skip confirmation prompt (use with caution)");
        reinstallCommand.AddOption(reinstallUuidOption);
        reinstallCommand.AddOption(reinstallForceOption);
        
        reinstallCommand.SetHandler(async (string? uuid, bool force) =>
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

            // Safety confirmation (unless --force is used)
            if (!force)
            {
                if (AnsiConsole.Profile.Capabilities.Interactive)
                {
                    AnsiConsole.MarkupLine("[bold red]⚠️  WARNING: This will completely reset the server to its initial state![/]");
                    AnsiConsole.MarkupLine("[red]All server files, configurations, and data will be permanently deleted![/]");
                    AnsiConsole.WriteLine();
                    AnsiConsole.MarkupLine($"[yellow]Server: {server.Name} ({server.UuidShort})[/]");
                    AnsiConsole.WriteLine();
                    
                    var confirm = AnsiConsole.Confirm("[bold red]Are you absolutely sure you want to reinstall this server?[/]", false);
                    if (!confirm)
                    {
                        AnsiConsole.MarkupLine("[yellow]Reinstall cancelled.[/]");
                        return;
                    }
                    
                    // Double confirmation for extra safety
                    var doubleConfirm = AnsiConsole.Confirm("[bold red]This action cannot be undone. Type 'yes' to confirm:[/]", false);
                    if (!doubleConfirm)
                    {
                        AnsiConsole.MarkupLine("[yellow]Reinstall cancelled.[/]");
                        return;
                    }
                }
                else
                {
                    AnsiConsole.MarkupLine("[red]✗ Reinstall requires interactive terminal for safety confirmation.[/]");
                    AnsiConsole.MarkupLine("[yellow]Use --force flag to skip confirmation (use with extreme caution!)[/]");
                    return;
                }
            }

            AnsiConsole.MarkupLine($"[yellow]Reinstalling server: {server.Name}[/]");
            AnsiConsole.MarkupLine("[yellow]This may take a few minutes...[/]");
            
            try
            {
                var reinstallResponse = await apiClient.ReinstallServerAsync(server.UuidShort ?? server.Uuid ?? "");
                
                if (reinstallResponse.Success && reinstallResponse.Data?.Server != null)
                {
                    var reinstalledServer = reinstallResponse.Data.Server;
                    AnsiConsole.MarkupLine($"[green]✓ Server '{reinstalledServer.Name}' reinstalled successfully![/]");
                    AnsiConsole.MarkupLine($"[blue]Server ID: {reinstalledServer.Id}[/]");
                    AnsiConsole.MarkupLine($"[blue]UUID: {reinstalledServer.UuidShort}[/]");
                    AnsiConsole.MarkupLine($"[blue]Updated: {reinstalledServer.UpdatedAt}[/]");
                    AnsiConsole.WriteLine();
                    AnsiConsole.MarkupLine("[green]The server has been reset to its initial state and is ready for configuration.[/]");
                }
                else
                {
                    AnsiConsole.MarkupLine($"[red]✗ Failed to reinstall server: {reinstallResponse.ErrorMessage}[/]");
                }
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ Error reinstalling server: {ex.Message}[/]");
            }
        }, reinstallUuidOption, reinstallForceOption);

        return reinstallCommand;
    }
}

