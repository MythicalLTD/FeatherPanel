using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
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
            AnsiConsole.MarkupLine("=====================================");

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

            // Get API URL
            var apiUrl = AnsiConsole.Ask<string>("Enter your FeatherPanel API URL (e.g., https://panel.example.com):");
            if (string.IsNullOrEmpty(apiUrl))
            {
                AnsiConsole.MarkupLine("[red]✗ API URL is required[/]");
                return;
            }

            // Get API Key (use password prompt to mask input)
            var apiKey = AnsiConsole.Prompt(
                new TextPrompt<string>("Enter your FeatherPanel API Key:")
                    .PromptStyle("green")
                    .Secret('*')
            );
            if (string.IsNullOrEmpty(apiKey))
            {
                AnsiConsole.MarkupLine("[red]✗ API Key is required[/]");
                return;
            }

            // Save configuration
            await configManager.SetApiUrlAsync(apiUrl);
            await configManager.SetApiKeyAsync(apiKey);

            AnsiConsole.MarkupLine("[green]✓ Configuration saved successfully![/]");

            // Test connection
            AnsiConsole.MarkupLine("[yellow]Testing connection...[/]");
            if (await apiClient.ValidateConnectionAsync())
            {
                AnsiConsole.MarkupLine("[green]✓ Connection test successful![/]");
                
                var session = await apiClient.GetUserSessionAsync();
                if (session?.UserInfo != null)
                {
                    AnsiConsole.MarkupLine($"[green]✓ Authenticated as: {session.UserInfo.Username}[/]");
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
}
