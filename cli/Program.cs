using System.CommandLine;
using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using FeatherCli.Core.Commands;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using FeatherCli.Core.Api.Services;
using Spectre.Console;

// Check for version flag before parsing
if (args.Contains("--version") || args.Contains("-v"))
{
    var version = Assembly.GetExecutingAssembly()
        .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?
        .InformationalVersion ?? "1.0.0";
    Console.WriteLine($"FeatherCli v{version}");
    Console.WriteLine("Built with .NET 9.0");
    Console.WriteLine("https://github.com/MythicalLTD/FeatherPanel");
    return 0;
}

try
{
    // Setup dependency injection
    var services = new ServiceCollection();
    
    // Configure logging based on verbose flag
    var isVerbose = args.Contains("--verbose");
    
    services.AddLogging(builder =>
    {
        builder.AddConsole();
        
        if (isVerbose)
        {
            builder.SetMinimumLevel(LogLevel.Information);
            // Keep HTTP logging for verbose mode
        }
        else
        {
            builder.SetMinimumLevel(LogLevel.Warning); // Only show warnings and errors by default
            
            // Suppress HTTP client logging
            builder.AddFilter("System.Net.Http.HttpClient", LogLevel.None);
            builder.AddFilter("Microsoft.Extensions.Http", LogLevel.None);
        }
    });

    // Add HTTP client
    services.AddHttpClient<FeatherPanelApiClient>(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(30);
    });
    
    // Add HTTP client for services
    services.AddHttpClient();

    // Add core services
    services.AddSingleton<ConfigManager>();
    services.AddSingleton<CommandRegistry>();
    
    // Add API services
    services.AddSingleton<ServerService>();
    services.AddSingleton<PowerService>();
    services.AddSingleton<LogService>();

    // Build service provider
    var serviceProvider = services.BuildServiceProvider();

    // Create command registry and root command
    var commandRegistry = serviceProvider.GetRequiredService<CommandRegistry>();
    var rootCommand = commandRegistry.CreateRootCommand();

    // Add global options
    var verboseOption = new Option<bool>("--verbose", "Enable verbose output");
    rootCommand.AddGlobalOption(verboseOption);

    // Add version command
    var versionCommand = new Command("version", "Show version information");
    versionCommand.SetHandler(() =>
    {
        var version = Assembly.GetExecutingAssembly()
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?
            .InformationalVersion ?? "1.0.0";
        AnsiConsole.MarkupLine($"[bold blue]FeatherCli v{version}[/]");
        AnsiConsole.MarkupLine("[dim]Built with .NET 9.0[/]");
        AnsiConsole.MarkupLine("[dim]https://github.com/MythicalLTD/FeatherPanel[/]");
    });
    rootCommand.AddCommand(versionCommand);

    // Run the command
    return await rootCommand.InvokeAsync(args);
}
catch (Exception ex)
{
    AnsiConsole.MarkupLine($"[red]✗ Unexpected error: {ex.Message}[/]");
    if (args.Contains("--verbose"))
    {
        AnsiConsole.MarkupLine($"[red]Stack trace: {ex.StackTrace}[/]");
    }
    return 1;
}
