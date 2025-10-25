using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using FeatherCli.Core.Models;
using Spectre.Console;
using ServerModel = FeatherCli.Core.Models.Server;

namespace FeatherCli.Commands.Server.Commands;

public class ServerLogsCommand : BaseServerCommand
{
    public Command CreateLogsCommand(IServiceProvider serviceProvider)
    {
        var logsCommand = new Command("logs", "View server logs");
        var logsUuidOption = new Option<string?>("--uuid", "Server UUID or short UUID (will prompt if not provided)");
        var logsLinesOption = new Option<int>("--lines", () => 50, "Number of lines to display (default: 50)");
        var logsUploadOption = new Option<bool>("--upload", "Upload logs to mclo.gs and get shareable URL");
        logsCommand.AddOption(logsUuidOption);
        logsCommand.AddOption(logsLinesOption);
        logsCommand.AddOption(logsUploadOption);
        
        logsCommand.SetHandler(async (string? uuid, int lines, bool upload) =>
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

            try
            {
                if (upload)
                {
                    AnsiConsole.MarkupLine($"[yellow]Uploading logs for server: {server.Name}[/]");
                    var uploadResponse = await apiClient.UploadServerLogsAsync(server.UuidShort ?? server.Uuid ?? "");
                    
                    if (uploadResponse.Success && uploadResponse.Data != null)
                    {
                        AnsiConsole.MarkupLine($"[green]✓ Logs uploaded successfully![/]");
                        AnsiConsole.MarkupLine($"[blue]Shareable URL: {uploadResponse.Data.Url}[/]");
                        AnsiConsole.MarkupLine($"[blue]Raw URL: {uploadResponse.Data.Raw}[/]");
                        AnsiConsole.MarkupLine($"[blue]Log ID: {uploadResponse.Data.Id}[/]");
                    }
                    else
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to upload logs: {uploadResponse.ErrorMessage}[/]");
                    }
                }
                else
                {
                    AnsiConsole.MarkupLine($"[blue]📋 Server Logs: {server.Name}[/]");
                    AnsiConsole.MarkupLine($"[dim]Showing last {lines} lines[/]");
                    AnsiConsole.WriteLine();

                    var logsResponse = await apiClient.GetServerLogsAsync(server.UuidShort ?? server.Uuid ?? "");
                    
                    if (logsResponse.Success && logsResponse.Data?.Response?.Data != null)
                    {
                        var logLines = logsResponse.Data.Response.Data;
                        var linesToShow = Math.Min(lines, logLines.Count);
                        var startIndex = Math.Max(0, logLines.Count - linesToShow);
                        
                        for (int i = startIndex; i < logLines.Count; i++)
                        {
                            var line = logLines[i];
                            if (string.IsNullOrWhiteSpace(line)) continue;
                            
                            // Clean up the line (remove carriage returns and leading/trailing whitespace)
                            line = line.Replace("\r", "").Trim();
                            if (string.IsNullOrEmpty(line)) continue;
                            
                            // Color code different log levels
                            if (line.Contains("[ERROR]") || line.Contains("ERROR:"))
                            {
                                AnsiConsole.MarkupLine($"[red]{line}[/]");
                            }
                            else if (line.Contains("[WARN]") || line.Contains("WARN:"))
                            {
                                AnsiConsole.MarkupLine($"[yellow]{line}[/]");
                            }
                            else if (line.Contains("[INFO]") || line.Contains("INFO:"))
                            {
                                AnsiConsole.MarkupLine($"[blue]{line}[/]");
                            }
                            else if (line.Contains("[DEBUG]") || line.Contains("DEBUG:"))
                            {
                                AnsiConsole.MarkupLine($"[dim]{line}[/]");
                            }
                            else
                            {
                                AnsiConsole.WriteLine(line);
                            }
                        }
                        
                        AnsiConsole.WriteLine();
                        AnsiConsole.MarkupLine($"[dim]Showing {linesToShow} of {logLines.Count} total log lines[/]");
                        AnsiConsole.MarkupLine($"[dim]Use --upload to share logs or --lines to see more/fewer lines[/]");
                    }
                    else
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to retrieve logs: {logsResponse.ErrorMessage}[/]");
                    }
                }
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ Error retrieving logs: {ex.Message}[/]");
            }
        }, logsUuidOption, logsLinesOption, logsUploadOption);

        return logsCommand;
    }

    public Command CreateInstallLogsCommand(IServiceProvider serviceProvider)
    {
        var installLogsCommand = new Command("install-logs", "View server installation logs");
        var installLogsUuidOption = new Option<string?>("--uuid", "Server UUID or short UUID (will prompt if not provided)");
        var installLogsUploadOption = new Option<bool>("--upload", "Upload installation logs to mclo.gs and get shareable URL");
        installLogsCommand.AddOption(installLogsUuidOption);
        installLogsCommand.AddOption(installLogsUploadOption);
        
        installLogsCommand.SetHandler(async (string? uuid, bool upload) =>
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

            try
            {
                if (upload)
                {
                    AnsiConsole.MarkupLine($"[yellow]Uploading installation logs for server: {server.Name}[/]");
                    var uploadResponse = await apiClient.UploadServerInstallLogsAsync(server.UuidShort ?? server.Uuid ?? "");
                    
                    if (uploadResponse.Success && uploadResponse.Data != null)
                    {
                        AnsiConsole.MarkupLine($"[green]✓ Installation logs uploaded successfully![/]");
                        AnsiConsole.MarkupLine($"[blue]Shareable URL: {uploadResponse.Data.Url}[/]");
                        AnsiConsole.MarkupLine($"[blue]Raw URL: {uploadResponse.Data.Raw}[/]");
                        AnsiConsole.MarkupLine($"[blue]Log ID: {uploadResponse.Data.Id}[/]");
                    }
                    else
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to upload installation logs: {uploadResponse.ErrorMessage}[/]");
                    }
                }
                else
                {
                    AnsiConsole.MarkupLine($"[blue]🔧 Installation Logs: {server.Name}[/]");
                    AnsiConsole.WriteLine();

                    var installLogsResponse = await apiClient.GetServerInstallLogsAsync(server.UuidShort ?? server.Uuid ?? "");
                    
                    if (installLogsResponse.Success && installLogsResponse.Data?.Response?.Data != null)
                    {
                        var installLogs = installLogsResponse.Data.Response.Data;
                        
                        if (string.IsNullOrWhiteSpace(installLogs))
                        {
                            AnsiConsole.MarkupLine("[yellow]No installation logs available for this server.[/]");
                        }
                        else
                        {
                            // Split by lines and display with proper formatting
                            var lines = installLogs.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                            
                            foreach (var line in lines)
                            {
                                var cleanLine = line.Replace("\r", "").Trim();
                                if (string.IsNullOrEmpty(cleanLine)) continue;
                                
                                // Color code different types of installation messages
                                if (cleanLine.Contains("ERROR") || cleanLine.Contains("error"))
                                {
                                    AnsiConsole.MarkupLine($"[red]{cleanLine}[/]");
                                }
                                else if (cleanLine.Contains("WARN") || cleanLine.Contains("warning"))
                                {
                                    AnsiConsole.MarkupLine($"[yellow]{cleanLine}[/]");
                                }
                                else if (cleanLine.Contains("Download") || cleanLine.Contains("download"))
                                {
                                    AnsiConsole.MarkupLine($"[blue]{cleanLine}[/]");
                                }
                                else if (cleanLine.Contains("curl") || cleanLine.Contains("Running"))
                                {
                                    AnsiConsole.MarkupLine($"[cyan]{cleanLine}[/]");
                                }
                                else
                                {
                                    AnsiConsole.WriteLine(cleanLine);
                                }
                            }
                            
                            AnsiConsole.WriteLine();
                            AnsiConsole.MarkupLine($"[dim]Use --upload to share installation logs[/]");
                        }
                    }
                    else
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to retrieve installation logs: {installLogsResponse.ErrorMessage}[/]");
                    }
                }
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ Error retrieving installation logs: {ex.Message}[/]");
            }
        }, installLogsUuidOption, installLogsUploadOption);

        return installLogsCommand;
    }
}

