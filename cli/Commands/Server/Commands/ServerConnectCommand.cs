using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using Spectre.Console;
using ServerModel = FeatherCli.Core.Models.Server;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace FeatherCli.Commands.Server.Commands;

public class ServerConnectCommand : BaseServerCommand
{
    public Command CreateConnectCommand(IServiceProvider serviceProvider)
    {
        var connectCommand = new Command("connect", "Connect to server console via Wings WebSocket for real-time access");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID (will prompt if not provided)");
        connectCommand.AddOption(uuidOption);
        
        connectCommand.SetHandler(async (string? uuid) =>
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

            await ConnectToServerConsole(apiClient, configManager, server);
        }, uuidOption);

        return connectCommand;
    }

    private async Task ConnectToServerConsole(FeatherPanelApiClient apiClient, ConfigManager configManager, ServerModel server)
    {
        try
        {
            AnsiConsole.MarkupLine($"[yellow]Connecting to server: {server.Name} ({server.UuidShort})[/]");
            AnsiConsole.WriteLine();

            // Get API URL and Key
            var apiUrl = await configManager.GetApiUrlAsync();
            var apiKey = await configManager.GetApiKeyAsync();
            
            if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
            {
                AnsiConsole.MarkupLine("[red]✗ API URL and Key must be configured[/]");
                return;
            }

            // Step 1: Get JWT token
            AnsiConsole.Status().Spinner(Spinner.Known.Dots).SpinnerStyle(Style.Parse("yellow")).Start("Getting authentication token...", ctx =>
            {
                // This will run synchronously
            });

            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
            httpClient.DefaultRequestHeaders.Add("Accept", "application/json");

            var jwtResponse = await httpClient.PostAsync($"{apiUrl.TrimEnd('/')}/api/user/servers/{server.UuidShort}/jwt", null);
            
            if (!jwtResponse.IsSuccessStatusCode)
            {
                AnsiConsole.MarkupLine("[red]✗ Failed to get JWT token[/]");
                return;
            }

            var jwtContent = await jwtResponse.Content.ReadAsStringAsync();
            var jwtJson = JsonNode.Parse(jwtContent);

            if (jwtJson?["success"]?.GetValue<bool>() != true)
            {
                AnsiConsole.MarkupLine("[red]✗ Failed to get JWT token[/]");
                return;
            }

            var connectionString = jwtJson["data"]?["connection_string"]?.GetValue<string>() ?? "";
            var token = jwtJson["data"]?["token"]?.GetValue<string>() ?? "";

            if (string.IsNullOrEmpty(connectionString) || string.IsNullOrEmpty(token))
            {
                AnsiConsole.MarkupLine("[red]✗ Invalid JWT response[/]");
                return;
            }

            AnsiConsole.MarkupLine("[green]✓ Got authentication token[/]");

            // Step 2: Connect to WebSocket
            AnsiConsole.MarkupLine("[yellow]Connecting to Wings daemon...[/]");
            
            var ws = new ClientWebSocket();
            
            // Set up TLS validation to accept all certificates
            ws.Options.RemoteCertificateValidationCallback = (sender, certificate, chain, sslPolicyErrors) => true;
            
            // Add Origin header to spoof request as coming from the panel
            ws.Options.SetRequestHeader("Origin", apiUrl.TrimEnd('/'));
            
            try
            {
                await ws.ConnectAsync(new Uri(connectionString), CancellationToken.None);
                AnsiConsole.MarkupLine("[green]✓ Connected to Wings daemon[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ Failed to connect: {ex.Message}[/]");
                AnsiConsole.MarkupLine($"[dim]Connection string: {connectionString}[/]");
                AnsiConsole.MarkupLine($"[dim]Origin header: {apiUrl.TrimEnd('/')}[/]");
                return;
            }

            // Step 3: Authenticate
            var authMessage = JsonSerializer.Serialize(new
            {
                @event = "auth",
                args = new[] { token }
            });

            var authBytes = Encoding.UTF8.GetBytes(authMessage);
            await ws.SendAsync(new ArraySegment<byte>(authBytes), WebSocketMessageType.Text, true, CancellationToken.None);

            AnsiConsole.MarkupLine("[yellow]Authenticating...[/]");

            // Wait for auth success
            var buffer = new byte[4096];
            var authTimeout = DateTime.Now.AddSeconds(15);
            bool authSuccess = false;

            while (DateTime.Now < authTimeout)
            {
                var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                var message = Encoding.UTF8.GetString(buffer, 0, result.Count);

                try
                {
                    var jsonMessage = JsonSerializer.Deserialize<JsonObject>(message);
                    if (jsonMessage != null && jsonMessage.TryGetPropertyValue("event", out var eventNode))
                    {
                        var eventType = eventNode?.GetValue<string>();
                        
                        if (eventType == "auth success")
                        {
                            authSuccess = true;
                            AnsiConsole.MarkupLine("[green]✓ Authenticated successfully[/]");
                            break;
                        }
                        else if (eventType == "auth_error")
                        {
                            AnsiConsole.MarkupLine("[red]✗ Authentication failed[/]");
                            return;
                        }
                    }
                }
                catch
                {
                    // Not JSON, skip
                }
            }

            if (!authSuccess)
            {
                AnsiConsole.MarkupLine("[red]✗ Authentication timeout[/]");
                return;
            }

            // Request logs
            var sendLogsMessage = JsonSerializer.Serialize(new
            {
                @event = "send logs",
                args = Array.Empty<string>()
            });

            var sendLogsBytes = Encoding.UTF8.GetBytes(sendLogsMessage);
            await ws.SendAsync(new ArraySegment<byte>(sendLogsBytes), WebSocketMessageType.Text, true, CancellationToken.None);

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[bold blue]════════════════════════════════════════[/]");
            AnsiConsole.MarkupLine($"[bold green]✓ Connected to {server.Name} Console[/]");
            AnsiConsole.MarkupLine("[bold blue]════════════════════════════════════════[/]");
            AnsiConsole.MarkupLine("[dim]Type your command and press Enter. Press Ctrl+C to exit.[/]");
            Console.Write("\n> ");
            Console.Out.Flush();

            // Start reading messages
            var running = true;
            var cts = new CancellationTokenSource();
            var lastCommandLock = new object();
            string lastCommand = ""; // Track last command to suppress echo
            
            // Start token refresh task
            var tokenRefreshTask = Task.Run(async () =>
            {
                while (running && ws.State == WebSocketState.Open)
                {
                    await Task.Delay(12 * 60 * 1000); // Refresh every 12 minutes
                    
                    if (!running || ws.State != WebSocketState.Open) break;

                    try
                    {
                        var refreshResponse = await httpClient.PostAsync($"{apiUrl.TrimEnd('/')}/api/user/servers/{server.UuidShort}/jwt", null);
                        if (refreshResponse.IsSuccessStatusCode)
                        {
                            var refreshContent = await refreshResponse.Content.ReadAsStringAsync();
                            var refreshData = JsonNode.Parse(refreshContent);
                            
                            if (refreshData?["success"]?.GetValue<bool>() == true)
                            {
                                var newToken = refreshData["data"]?["token"]?.GetValue<string>() ?? "";
                                var refreshAuth = JsonSerializer.Serialize(new
                                {
                                    @event = "auth",
                                    args = new[] { newToken }
                                });
                                var refreshAuthBytes = Encoding.UTF8.GetBytes(refreshAuth);
                                await ws.SendAsync(new ArraySegment<byte>(refreshAuthBytes), WebSocketMessageType.Text, true, cts.Token);
                            }
                        }
                    }
                    catch
                    {
                        // Silent fail for background refresh
                    }
                }
            });

            // Start input listening task  
            var inputTask = Task.Run(() =>
            {
                while (running && ws.State == WebSocketState.Open)
                {
                    // Don't show prompt here - it's shown by the output handler
                    var input = Console.ReadLine();
                    
                    if (string.IsNullOrEmpty(input))
                    {
                        // User pressed enter without input - re-show prompt
                        Console.Write("> ");
                        continue;
                    }
                    
                    if (input.Trim() == "exit" || input.Trim() == "quit")
                    {
                        running = false;
                        break;
                    }
                    
                    // Store command to suppress echo
                    lock (lastCommandLock)
                    {
                        lastCommand = input.Trim();
                    }
                    
                    // Send command to server via WebSocket
                    try
                    {
                        var commandMessage = JsonSerializer.Serialize(new
                        {
                            @event = "send command",
                            args = new[] { input }
                        });
                        
                        var commandBytes = Encoding.UTF8.GetBytes(commandMessage);
                        ws.SendAsync(new ArraySegment<byte>(commandBytes), WebSocketMessageType.Text, true, cts.Token).Wait(cts.Token);
                        
                        // Show prompt after sending command
                        Console.Write("> ");
                        Console.Out.Flush();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to send command: {ex.Message}");
                        Console.Write("> ");
                        Console.Out.Flush();
                    }
                }
            });

            // Main message receiving loop
            while (ws.State == WebSocketState.Open && running)
            {
                try
                {
                    var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                    
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Connection closed", CancellationToken.None);
                        break;
                    }

                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    
                    try
                    {
                        var jsonMessage = JsonSerializer.Deserialize<JsonObject>(message);
                        
                        if (jsonMessage != null && jsonMessage.TryGetPropertyValue("event", out var eventNode))
                        {
                            var eventType = eventNode?.GetValue<string>();
                            
                            if (eventType == "console output")
                            {
                                if (jsonMessage.TryGetPropertyValue("args", out var argsNode) && argsNode is JsonArray argsArray && argsArray.Count > 0)
                                {
                                    var rawOutput = argsArray[0]?.GetValue<string>() ?? "";
                                    
                                    // Skip if this is just an echo of the command we sent
                                    bool shouldSkip = false;
                                    lock (lastCommandLock)
                                    {
                                        var rawCleaned = rawOutput.Trim();
                                        if (!string.IsNullOrEmpty(lastCommand) && rawCleaned == lastCommand)
                                        {
                                            // This is an echo of our command - skip it and clear the tracking
                                            lastCommand = "";
                                            shouldSkip = true;
                                        }
                                    }
                                    
                                    if (shouldSkip)
                                        continue; // Skip echo completely
                                    
                                    // Process the output - remove Wings prefix, handle ANSI codes
                                    var output = rawOutput.TrimStart(new[] { '>', ' ' }); // Remove "> " prefix
                                    output = ProcessAnsiCodes(output);
                                    
                                    // Write the output (no extra newline, output already has format)
                                    Console.Write(output);
                                    Console.Out.Flush();
                                }
                            }
                            else if (eventType == "status")
                            {
                                if (jsonMessage.TryGetPropertyValue("args", out var argsNode) && argsNode is JsonArray argsArray && argsArray.Count > 0)
                                {
                                    var status = argsArray[0]?.GetValue<string>() ?? "";
                                    AnsiConsole.MarkupLine($"[cyan]Server status: {status}[/]");
                                }
                            }
                            else if (eventType == "daemon error")
                            {
                                AnsiConsole.MarkupLine("[red]Daemon error occurred[/]");
                            }
                            else if (eventType == "token expired" || eventType == "jwt error")
                            {
                                AnsiConsole.MarkupLine("[red]JWT token expired, disconnecting...[/]");
                                break;
                            }
                        }
                        else
                        {
                            // Raw text output
                            Console.Write(message);
                        }
                    }
                    catch
                    {
                        // Raw text output
                        Console.Write(message);
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }

            running = false;
            
            // Cleanup
            if (ws.State == WebSocketState.Open || ws.State == WebSocketState.CloseReceived)
            {
                try
                {
                    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Disconnecting", CancellationToken.None);
                }
                catch { }
            }
            
            if (ws.State == WebSocketState.Aborted)
            {
                ws.Dispose();
            }
            
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Disconnected from server[/]");
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ Error: {ex.Message}[/]");
        }
    }

    private static string ProcessAnsiCodes(string text)
    {
        if (string.IsNullOrEmpty(text))
            return text;

        // Normalize line endings
        text = text.Replace("\r\n", "\n");
        text = text.Replace("\r", "\n");

        // Keep ANSI codes - let the terminal handle them
        // Just ensure proper newline handling
        return text;
    }
}

