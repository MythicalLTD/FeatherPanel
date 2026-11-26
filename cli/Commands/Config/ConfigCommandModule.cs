using System.CommandLine;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using FeatherCli.Core.Api.Models;
using FeatherCli.Core.Api.Services;
using FeatherCli.Core.Commands;
using Spectre.Console;

namespace FeatherCli.Commands.Config;

public class ConfigCommandModule : ICommandModule
{
    public string Name => "config";
    public string Description => "Manage CLI configuration";

    public Command CreateCommand(IServiceProvider serviceProvider)
    {
        var configCommand = new Command(Name, Description);

        // Config setup command
        var setupCommand = new Command("setup", "Setup FeatherCli configuration");
        setupCommand.SetHandler(async () =>
        {
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();
            var apiClient = serviceProvider.GetRequiredService<FeatherPanelApiClient>();

            AnsiConsole.MarkupLine("[bold blue]FeatherCli Configuration Setup[/]");
            AnsiConsole.MarkupLine("=====================================\n");

            // Ensure config directory exists
            if (!configManager.EnsureConfigDirectoryExists())
            {
                AnsiConsole.MarkupLine("[red]✗ Failed to create configuration directory[/]");
                return;
            }

            // Ensure config file exists
            if (!await configManager.EnsureConfigFileExistsAsync())
            {
                AnsiConsole.MarkupLine("[red]✗ Failed to create configuration file[/]");
                return;
            }

            // Step 1: Get Panel URL
            var apiUrl = AnsiConsole.Ask<string>("[bold cyan]Enter your FeatherPanel URL[/] (e.g., https://panel.example.com):");
            if (string.IsNullOrEmpty(apiUrl))
            {
                AnsiConsole.MarkupLine("[red]✗ Panel URL is required[/]");
                return;
            }

            AnsiConsole.MarkupLine("[yellow]Testing panel connectivity...[/]");
            
            // Test basic connectivity
            if (!await TestPanelConnectivityAsync(apiUrl))
            {
                AnsiConsole.MarkupLine("[red]✗ Cannot reach panel at {0}. Please check the URL and try again.[/]", apiUrl);
                return;
            }

            AnsiConsole.MarkupLine("[green]✓ Panel is reachable[/]\n");

            // Step 2: Choose setup mode
            var setupMode = AnsiConsole.Prompt(
                new SelectionPrompt<string>()
                    .Title("[bold cyan]Choose setup method:[/]")
                    .PageSize(10)
                    .AddChoices(new[] { "easy", "advanced" })
            );

            string? apiKey;

            if (setupMode == "easy")
            {
                apiKey = await HandleEasySetupAsync(serviceProvider, apiUrl);
                if (string.IsNullOrEmpty(apiKey))
                {
                    AnsiConsole.MarkupLine("[red]✗ Easy setup failed. Please use advanced setup instead.[/]");
                    return;
                }
            }
            else // advanced
            {
                apiKey = await HandleAdvancedSetupAsync(apiUrl);
                if (string.IsNullOrEmpty(apiKey))
                {
                    AnsiConsole.MarkupLine("[red]✗ API Key is required[/]");
                    return;
                }
            }

            // Save configuration
            AnsiConsole.MarkupLine("\n[yellow]Saving configuration...[/]");
            await configManager.SetApiUrlAsync(apiUrl);
            await configManager.SetApiKeyAsync(apiKey);
            AnsiConsole.MarkupLine("[green]✓ Configuration saved successfully![/]\n");

            // Test connection
            AnsiConsole.MarkupLine("[yellow]Testing connection...[/]");
            if (await apiClient.ValidateConnectionAsync())
            {
                AnsiConsole.MarkupLine("[green]✓ Connection test successful![/]");
                
                var session = await apiClient.GetUserSessionAsync();
                if (session?.UserInfo != null)
                {
                    AnsiConsole.MarkupLine($"[green]✓ Authenticated as: [bold]{session.UserInfo.Username}[/][/]");
                }
            }
            else
            {
                AnsiConsole.MarkupLine("[red]✗ Connection test failed. Please check your API URL and key.[/]");
            }
        });
        configCommand.AddCommand(setupCommand);

        // Config show command
        var showCommand = new Command("show", "Show current configuration");
        showCommand.SetHandler(async () =>
        {
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();
            await configManager.ShowConfigurationAsync();
        });
        configCommand.AddCommand(showCommand);

        // Config set command
        var setCommand = new Command("set", "Set a configuration value");
        var configKeyArgument = new Argument<string>("key", "Configuration key (api_url, api_key)");
        var configValueArgument = new Argument<string>("value", "Configuration value");
        setCommand.AddArgument(configKeyArgument);
        setCommand.AddArgument(configValueArgument);
        setCommand.SetHandler(async (string key, string value) =>
        {
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();

            switch (key.ToLower())
            {
                case "api_url":
                    await configManager.SetApiUrlAsync(value);
                    break;
                case "api_key":
                    await configManager.SetApiKeyAsync(value);
                    break;
                default:
                    AnsiConsole.MarkupLine($"[red]✗ Unknown configuration key: {key}[/]");
                    AnsiConsole.MarkupLine("[yellow]Available keys: api_url, api_key[/]");
                    break;
            }
        }, configKeyArgument, configValueArgument);
        configCommand.AddCommand(setCommand);

        // Config test command
        var testCommand = new Command("test", "Test API connection");
        testCommand.SetHandler(async () =>
        {
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();
            var apiClient = serviceProvider.GetRequiredService<FeatherPanelApiClient>();

            if (!await configManager.IsConfiguredAsync())
            {
                AnsiConsole.MarkupLine("[red]✗ Configuration not found. Please run 'feathercli config setup' first.[/]");
                return;
            }

            AnsiConsole.MarkupLine("[yellow]Testing API connection...[/]");
            
            if (await apiClient.ValidateConnectionAsync())
            {
                AnsiConsole.MarkupLine("[green]✓ Connection test successful![/]");
                
                var session = await apiClient.GetUserSessionAsync();
                if (session?.UserInfo != null)
                {
                    AnsiConsole.MarkupLine($"[green]✓ Authenticated as: {session.UserInfo.Username}[/]");
                    AnsiConsole.MarkupLine($"[green]✓ User ID: {session.UserInfo.Id}[/]");
                    AnsiConsole.MarkupLine($"[green]✓ Permissions: {string.Join(", ", session.Permissions ?? new List<string>())}[/]");
                }
            }
            else
            {
                AnsiConsole.MarkupLine("[red]✗ Connection test failed. Please check your configuration.[/]");
            }
        });
        configCommand.AddCommand(testCommand);

        return configCommand;
    }

    private async Task<bool> TestPanelConnectivityAsync(string panelUrl)
    {
        try
        {
            using var httpClient = new HttpClient 
            { 
                Timeout = TimeSpan.FromSeconds(10)
            };
            
            // Disable SSL verification for self-signed certificates
            var handler = new HttpClientHandler();
            handler.ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true;
            
            using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(10) };
            var baseUrl = panelUrl.TrimEnd('/');
            
            // Try to reach the panel - accept any response (even errors like 404, 401)
            // as long as the server is reachable
            try
            {
                var response = await client.GetAsync($"{baseUrl}/");
                return true; // Server is reachable
            }
            catch (HttpRequestException)
            {
                // Server not reachable
                return false;
            }
        }
        catch
        {
            return false;
        }
    }

    private async Task<string?> HandleEasySetupAsync(IServiceProvider serviceProvider, string panelUrl)
    {
        AnsiConsole.MarkupLine("\n[bold cyan]Easy Setup Mode[/]");
        AnsiConsole.MarkupLine("This will generate an API key for you.\n");

        var useOAuth = AnsiConsole.Confirm("[bold]Would you like to use OAuth2 to generate the API key?[/]", false);

        if (useOAuth)
        {
            return await HandleOAuth2SetupAsync(serviceProvider, panelUrl);
        }
        else
        {
            AnsiConsole.MarkupLine("[yellow]Note:[/] You'll need to manually generate an API key from your panel.\n");
            
            var apiKeysUrl = $"{panelUrl.TrimEnd('/')}/dashboard/account?tab=api-keys";
            AnsiConsole.MarkupLine("[bold]To generate an API key:[/]");
            AnsiConsole.MarkupLine($"1. Open: [cyan]{apiKeysUrl}[/]");
            AnsiConsole.MarkupLine("2. Click 'Create Token'");
            AnsiConsole.MarkupLine("3. Enter a name for this CLI");
            AnsiConsole.MarkupLine("4. Copy the generated token\n");

            var apiKey = AnsiConsole.Prompt(
                new TextPrompt<string>("[bold cyan]Paste your API token here:[/]")
                    .PromptStyle("cyan")
                    .Secret('*')
            );

            return string.IsNullOrEmpty(apiKey) ? null : apiKey;
        }
    }

    private async Task<string?> HandleOAuth2SetupAsync(IServiceProvider serviceProvider, string panelUrl)
    {
        AnsiConsole.MarkupLine("[bold cyan]OAuth2 Setup Mode[/]");
        AnsiConsole.MarkupLine("[dim]Your panel will authorize this CLI with your account.[/]\n");

        var oauth2Service = serviceProvider.GetRequiredService<OAuth2Service>();

        // Find available port
        AnsiConsole.MarkupLine("[bold]Step 1: Finding available port[/]");
        var port = await FindAvailablePortAsync(3333, 3350); // Try ports 3333-3350
        
        if (port == 0)
        {
            AnsiConsole.MarkupLine("[red]✗ Could not find an available port in range 3333-3350[/]");
            return null;
        }

        AnsiConsole.MarkupLine($"[green]✓ Using port {port}[/]\n");

        var callbackIp = GetPreferredLocalIpv4Address();
        if (string.IsNullOrEmpty(callbackIp))
        {
            AnsiConsole.MarkupLine("[red]✗ Could not determine a non-loopback IPv4 address for OAuth2 callback[/]");
            AnsiConsole.MarkupLine("[yellow]Please ensure this server has a reachable IPv4 address, then try again.[/]");
            return null;
        }

        var callbackUrl = $"http://{callbackIp}:{port}/oauth/callback";
        AnsiConsole.MarkupLine($"[dim]Using callback address: {callbackUrl}[/]");

        var restrictToServerIp = AnsiConsole.Confirm(
            $"[bold]Limit this API key to this server IP only ({callbackIp})?[/]",
            true);

        var notifyOnForeignIp = false;
        if (restrictToServerIp)
        {
            notifyOnForeignIp = AnsiConsole.Confirm(
                "[bold]Send email alerts if this API key is used from another IP?[/]",
                true);
        }

        // Create OAuth2 request
        var oauth2Request = new OAuth2AuthorizationRequest
        {
            Name = "FeatherCli",
            CallbackUrl = callbackUrl,
            AppName = "FeatherCli",
            AppLogo = "https://github.com/featherpanel-com.png",
            Description = "FeatherPanel CLI Tool",
            Mode = "server",
            AllowedIps = restrictToServerIp ? callbackIp : null,
            AlertCors = restrictToServerIp && notifyOnForeignIp
        };

        // Build authorization URL
        var authUrl = await oauth2Service.BuildAuthorizationUrlAsync(oauth2Request, panelUrl);
        if (string.IsNullOrEmpty(authUrl))
        {
            AnsiConsole.MarkupLine("[red]✗ Failed to build authorization URL[/]");
            return null;
        }

        AnsiConsole.MarkupLine("[bold]Step 2: Authorize with your panel[/]");
        AnsiConsole.MarkupLine("[yellow]⚠ Copy and paste this URL into your browser:[/]\n");
        AnsiConsole.Write(new Text(authUrl, Style.Parse("cyan")));
        AnsiConsole.WriteLine("\n");

        // Start local server to listen for callback
        using var httpListener = new HttpListener();
        httpListener.Prefixes.Add($"http://{callbackIp}:{port}/");

        try
        {
            httpListener.Start();
            AnsiConsole.MarkupLine($"[green]✓ Listening on port {port}[/]");
            AnsiConsole.MarkupLine("[yellow]⏳ Waiting for authorization response...[/]");
            AnsiConsole.MarkupLine("[dim]After you approve in your browser, the credentials will be received here.[/]\n");

            // Wait for callback with timeout (10 minutes)
            var callbackTask = httpListener.GetContextAsync();
            var timeoutTask = Task.Delay(TimeSpan.FromMinutes(10));
            
            var completedTask = await Task.WhenAny(callbackTask, timeoutTask);

            if (completedTask == timeoutTask)
            {
                AnsiConsole.MarkupLine("[red]✗ Authorization timeout (10 minutes). Please try again.[/]");
                return null;
            }

            var context = await callbackTask;
            var request = context.Request;

            // Parse the OAuth2 response from the request body
            string responseBody;
            using (var reader = new StreamReader(request.InputStream))
            {
                responseBody = await reader.ReadToEndAsync();
            }

            // Send success response to browser
            var successHtml = @"
<!DOCTYPE html>
<html>
<head>
    <title>Authorization Successful</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f0f0; }
        .container { background: white; padding: 40px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .success { color: #27ae60; font-size: 28px; margin-bottom: 20px; }
        p { color: #555; margin: 15px 0; line-height: 1.6; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='success'>✓ Authorization Successful!</div>
        <p>Your FeatherCli has been authorized with your FeatherPanel account.</p>
        <p>You can close this window and return to your terminal.</p>
    </div>
</body>
</html>";

            var responseBuffer = System.Text.Encoding.UTF8.GetBytes(successHtml);
            context.Response.ContentLength64 = responseBuffer.Length;
            context.Response.ContentType = "text/html";
            await context.Response.OutputStream.WriteAsync(responseBuffer, 0, responseBuffer.Length);
            context.Response.OutputStream.Close();

            // Parse the OAuth2 response
            var oauthResponse = JsonConvert.DeserializeObject<OAuth2ServerModeCallback>(responseBody);

            if (oauthResponse == null || !oauthResponse.Success)
            {
                AnsiConsole.MarkupLine("[red]✗ OAuth2 response invalid[/]");
                if (!string.IsNullOrEmpty(oauthResponse?.Error))
                {
                    AnsiConsole.MarkupLine($"[red]Error: {oauthResponse.Error}[/]");
                }
                return null;
            }

            if (string.IsNullOrEmpty(oauthResponse.PrivateKey))
            {
                AnsiConsole.MarkupLine("[red]✗ No API key received from panel[/]");
                return null;
            }

            AnsiConsole.MarkupLine("[green]✓ Authorization successful![/]");
            AnsiConsole.MarkupLine("[green]✓ API credentials received from panel[/]\n");

            // Validate the credentials
            AnsiConsole.MarkupLine("[yellow]Validating credentials...[/]");
            var validation = await oauth2Service.ValidateCredentialsAsync(oauthResponse.PublicKey ?? "", panelUrl);
            
            if (validation?.Valid == true)
            {
                AnsiConsole.MarkupLine("[green]✓ Credentials validated successfully![/]\n");
            }
            else
            {
                AnsiConsole.MarkupLine("[yellow]⚠ Credentials received but validation skipped[/]");
                AnsiConsole.MarkupLine("[dim]The API key should still be functional[/]\n");
            }

            return oauthResponse.PrivateKey;
        }
        catch (HttpListenerException ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ Failed to start callback server on port {port}[/]");
            AnsiConsole.MarkupLine($"[dim]Error: {ex.Message}[/]");
            AnsiConsole.MarkupLine("[yellow]Please try again with a different port or use advanced setup to enter the API key manually.[/]");
            return null;
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ OAuth2 setup error: {ex.Message}[/]");
            return null;
        }
        finally
        {
            if (httpListener.IsListening)
            {
                httpListener.Stop();
            }
        }
    }

    private Task<int> FindAvailablePortAsync(int startPort, int endPort)
    {
        for (int port = startPort; port <= endPort; port++)
        {
            try
            {
                using var listener = new TcpListener(IPAddress.Any, port);
                listener.Start();
                listener.Stop();
                return Task.FromResult(port);
            }
            catch (SocketException)
            {
                // Port in use, try next
                continue;
            }
        }
        return Task.FromResult(0); // No available port found
    }

    private string? GetPreferredLocalIpv4Address()
    {
        try
        {
            var host = Dns.GetHostEntry(Dns.GetHostName());
            foreach (var address in host.AddressList)
            {
                if (address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(address))
                {
                    return address.ToString();
                }
            }
        }
        catch
        {
            // Ignore and return null below
        }

        return null;
    }

    private Task<string?> HandleAdvancedSetupAsync(string panelUrl)
    {
        AnsiConsole.MarkupLine("\n[bold cyan]Advanced Setup Mode[/]\n");

        var apiKeysUrl = $"{panelUrl.TrimEnd('/')}/dashboard/account?tab=api-keys";
        AnsiConsole.MarkupLine("[bold]To generate an API key:[/]");
        AnsiConsole.MarkupLine($"1. Open: [cyan]{apiKeysUrl}[/]");
        AnsiConsole.MarkupLine("2. Click 'Create Token'");
        AnsiConsole.MarkupLine("3. Enter a name for this CLI (e.g., 'FeatherCli')");
        AnsiConsole.MarkupLine("4. Copy the generated token\n");

        AnsiConsole.MarkupLine("[dim]Or paste an existing API token if you already have one[/]\n");

        var apiKey = AnsiConsole.Prompt(
            new TextPrompt<string>("[bold cyan]Enter your API key:[/]")
                .PromptStyle("cyan")
                .Secret('*')
        );

        return Task.FromResult<string?>(string.IsNullOrEmpty(apiKey) ? null : apiKey);
    }
}

