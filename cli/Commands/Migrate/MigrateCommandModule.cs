using System.CommandLine;
using System.CommandLine.Invocation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using FeatherCli.Core.Commands;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using FeatherCli.Commands.Migrate.Models;
using FeatherCli.Commands.Migrate.Services;
using FeatherCli.Commands.Migrate.Validators;
using FeatherCli.Commands.Migrate.Display;
using FeatherCli.Commands.Migrate.Utils;
using Spectre.Console;
using System.Text.Json;

namespace FeatherCli.Commands.Migrate;

public class MigrateCommandModule : ICommandModule
{
    private PterodactylConfig? _pterodactylConfig;
    private MigrationState? _migrationState;
    private MigrationProgressService? _progressService;
    private StagingDatabaseOptions? _stagingDbOptions;
    private SqlDumpImportService? _sqlDumpImportService;
    private string? _stagingDatabaseName;
    private bool _ownsStagingDatabase;

    public string Name => "migrate";
    public string Description => "Migrate from Pterodactyl to FeatherPanel";

    public Command CreateCommand(IServiceProvider serviceProvider)
    {
        var migrateCommand = new Command(Name, Description);
        
        var confirmBlueprintOption = new Option<bool>(
            "--confirm-blueprint",
            description: "Skip the Blueprint warning confirmation dialog",
            getDefaultValue: () => false
        );
        
        var confirmMigrateOption = new Option<bool>(
            "--confirm-migrate",
            description: "Skip the final migration confirmation dialog",
            getDefaultValue: () => false
        );
        
        var pterodactylDirOption = new Option<string?>(
            "--pterodactyl-dir",
            description: "Path to Pterodactyl installation directory (skips the prompt)",
            getDefaultValue: () => null
        );

        var sqlDumpOption = new Option<string?>(
            "--sql-dump",
            description: "Path to a Pterodactyl .sql dump",
            getDefaultValue: () => null
        );

        var envFileOption = new Option<string?>(
            "--env-file",
            description: "Panel .env file (for --sql-dump; provides APP_KEY)",
            getDefaultValue: () => null
        );

        var appKeyOption = new Option<string?>(
            "--app-key",
            description: "Pterodactyl APP_KEY (alternative to --env-file)",
            getDefaultValue: () => null
        );

        var stagingDbHostOption = new Option<string?>(
            "--staging-db-host",
            description: "MySQL host for loading --sql-dump (default: 127.0.0.1)",
            getDefaultValue: () => null
        );

        var stagingDbPortOption = new Option<string?>(
            "--staging-db-port",
            description: "MySQL port for --sql-dump (default: 3306)",
            getDefaultValue: () => null
        );

        var stagingDbUserOption = new Option<string?>(
            "--staging-db-user",
            description: "MySQL user for --sql-dump (default: root)",
            getDefaultValue: () => null
        );

        var stagingDbPasswordOption = new Option<string?>(
            "--staging-db-password",
            description: "MySQL password for --sql-dump",
            getDefaultValue: () => null
        );
        
        var resetOption = new Option<bool>(
            "--reset",
            description: "Clear existing migration progress and start from scratch",
            getDefaultValue: () => false
        );
        
        migrateCommand.AddOption(confirmBlueprintOption);
        migrateCommand.AddOption(confirmMigrateOption);
        migrateCommand.AddOption(pterodactylDirOption);
        migrateCommand.AddOption(sqlDumpOption);
        migrateCommand.AddOption(envFileOption);
        migrateCommand.AddOption(appKeyOption);
        migrateCommand.AddOption(stagingDbHostOption);
        migrateCommand.AddOption(stagingDbPortOption);
        migrateCommand.AddOption(stagingDbUserOption);
        migrateCommand.AddOption(stagingDbPasswordOption);
        migrateCommand.AddOption(resetOption);
        
        migrateCommand.SetHandler(async (InvocationContext context) =>
        {
            var logger = serviceProvider.GetService<ILogger<MigrateCommandModule>>();
            var dbLogger = serviceProvider.GetService<ILogger<PterodactylDatabaseService>>();
            var maintenanceLogger = serviceProvider.GetService<ILogger<PterodactylMaintenanceService>>();
            var progressLogger = serviceProvider.GetService<ILogger<MigrationProgressService>>();
            var dumpLogger = serviceProvider.GetService<ILogger<SqlDumpImportService>>();
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();
            var apiClient = serviceProvider.GetRequiredService<FeatherPanelApiClient>();

            await RunMigrationWizardAsync(
                logger,
                dbLogger,
                maintenanceLogger,
                progressLogger,
                dumpLogger,
                configManager,
                apiClient,
                context.ParseResult.GetValueForOption(confirmBlueprintOption),
                context.ParseResult.GetValueForOption(confirmMigrateOption),
                context.ParseResult.GetValueForOption(pterodactylDirOption),
                context.ParseResult.GetValueForOption(sqlDumpOption),
                context.ParseResult.GetValueForOption(envFileOption),
                context.ParseResult.GetValueForOption(appKeyOption),
                context.ParseResult.GetValueForOption(stagingDbHostOption),
                context.ParseResult.GetValueForOption(stagingDbPortOption),
                context.ParseResult.GetValueForOption(stagingDbUserOption),
                context.ParseResult.GetValueForOption(stagingDbPasswordOption),
                context.ParseResult.GetValueForOption(resetOption));
        });

        // Add check subcommand
        var checkCommand = new Command("check", "Check if Pterodactyl installation is ready for migration (without migrating)");
        
        var checkPterodactylDirOption = new Option<string?>(
            "--pterodactyl-dir",
            description: "Path to Pterodactyl installation directory (skips the prompt)",
            getDefaultValue: () => null
        );
        
        checkCommand.AddOption(checkPterodactylDirOption);
        
        checkCommand.SetHandler(async (string? pterodactylDir) =>
        {
            var dbLogger = serviceProvider.GetService<ILogger<PterodactylDatabaseService>>();
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();
            var apiClient = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            await RunReadinessCheckAsync(dbLogger, configManager, apiClient, pterodactylDir);
        }, checkPterodactylDirOption);
        
        migrateCommand.AddCommand(checkCommand);

        return migrateCommand;
    }

    private async Task RunMigrationWizardAsync(
        ILogger<MigrateCommandModule>? logger = null, 
        ILogger<PterodactylDatabaseService>? dbLogger = null,
        ILogger<PterodactylMaintenanceService>? maintenanceLogger = null,
        ILogger<MigrationProgressService>? progressLogger = null,
        ILogger<SqlDumpImportService>? dumpLogger = null,
        ConfigManager? configManager = null,
        FeatherPanelApiClient? apiClient = null,
        bool confirmBlueprint = false,
        bool confirmMigrate = false,
        string? pterodactylDir = null,
        string? sqlDump = null,
        string? envFile = null,
        string? appKey = null,
        string? stagingDbHost = null,
        string? stagingDbPort = null,
        string? stagingDbUser = null,
        string? stagingDbPassword = null,
        bool reset = false)
    {
        // Initialize progress tracking
        _progressService = new MigrationProgressService(logger: progressLogger);
        
        // Handle reset flag - clear progress and start fresh
        if (reset)
        {
            var existingProgress = _progressService.LoadProgress();
            if (existingProgress != null)
            {
                _progressService.ClearProgress();
                AnsiConsole.MarkupLine("[green]✓ Cleared existing migration progress (--reset flag)[/]");
                AnsiConsole.MarkupLine("[yellow]Starting fresh migration from step 0...[/]");
            }
            else
            {
                AnsiConsole.MarkupLine("[yellow]No existing progress found. Starting fresh migration...[/]");
            }
            _migrationState = null;
        }
        else
        {
            // Try to load existing migration state (for resume functionality)
            _migrationState = _progressService.LoadProgress();
            
            if (_migrationState != null)
            {
                // Check if migration is already completed
                if (_migrationState.Status == "completed" || _migrationState.LastCompletedStep == "All steps completed")
                {
                    AnsiConsole.MarkupLine("[bold green]═══════════════════════════════════════════════════════════[/]");
                    AnsiConsole.MarkupLine("[bold green]  ✓ Migration Already Completed[/]");
                    AnsiConsole.MarkupLine("[bold green]═══════════════════════════════════════════════════════════[/]");
                    AnsiConsole.WriteLine();
                    AnsiConsole.MarkupLine("[green]The migration from Pterodactyl to FeatherPanel has already been performed.[/]");
                    AnsiConsole.MarkupLine($"[dim]Completed on: {_migrationState.StartedAt:yyyy-MM-dd HH:mm:ss} UTC[/]");
                    AnsiConsole.MarkupLine($"[dim]Last step: {_migrationState.LastCompletedStep}[/]");
                    AnsiConsole.MarkupLine($"[dim]Total steps completed: {_migrationState.CompletedSteps.Count}[/]");
                    AnsiConsole.WriteLine();
                    AnsiConsole.MarkupLine("[yellow]If you want to run the migration again, use the --reset flag:[/]");
                    AnsiConsole.MarkupLine("[dim]  feathercli migrate --reset[/]");
                    AnsiConsole.WriteLine();
                    return;
                }
                
                AnsiConsole.MarkupLine($"[yellow]Found existing migration progress. Last step: {_migrationState.LastCompletedStep}[/]");
                AnsiConsole.MarkupLine($"[yellow]Completed steps ({_migrationState.CompletedSteps.Count}): {string.Join(", ", _migrationState.CompletedSteps)}[/]");
                
                if (!confirmMigrate)
                {
                    var resume = AnsiConsole.Confirm("Do you want to resume from the last completed step?", true);
                    if (!resume)
                    {
                        var clear = AnsiConsole.Confirm("Do you want to clear the existing progress and start fresh?", false);
                        if (clear)
                        {
                            _progressService.ClearProgress();
                            _migrationState = null;
                            AnsiConsole.MarkupLine("[green]Progress cleared. Starting fresh migration.[/]");
                        }
                        else
                        {
                            AnsiConsole.MarkupLine("[yellow]Keeping existing progress. Migration will resume from last completed step.[/]");
                        }
                    }
                    else
                    {
                        AnsiConsole.MarkupLine("[green]Resuming migration from last completed step...[/]");
                        AnsiConsole.MarkupLine("[dim]Completed steps will be skipped automatically.[/]");
                    }
                }
                else
                {
                    AnsiConsole.MarkupLine("[green]Resuming migration from last completed step (--confirm-migrate flag set)...[/]");
                    AnsiConsole.MarkupLine("[dim]Completed steps will be skipped automatically.[/]");
                }
            }
        }
        
        // Create new migration state if none exists
        if (_migrationState == null)
        {
            _migrationState = new MigrationState
            {
                StartedAt = DateTime.UtcNow,
                Status = "in_progress"
            };
            _progressService.SaveProgress(_migrationState);
        }
        else
        {
            // Update status if resuming
            _migrationState.Status = "in_progress";
            _progressService.SaveProgress(_migrationState);
        }

        AnsiConsole.MarkupLine("[bold blue]FeatherPanel Migration Wizard[/]");
        AnsiConsole.MarkupLine("=====================================");
        AnsiConsole.MarkupLine($"[dim]Progress file: {_progressService.GetProgressFilePath()}[/]");
        AnsiConsole.WriteLine();

        // Check FeatherPanel API configuration first
        if (configManager == null || apiClient == null)
        {
            AnsiConsole.MarkupLine("[red]✗ FeatherPanel API client not available[/]");
            return;
        }

        AnsiConsole.MarkupLine("[yellow]Checking FeatherPanel API configuration...[/]");
        
        var isConfigured = await configManager.IsConfiguredAsync();
        if (!isConfigured)
        {
            AnsiConsole.MarkupLine("[red]✗ FeatherPanel API is not configured[/]");
            AnsiConsole.MarkupLine("[yellow]Please run 'feathercli config setup' first to configure the API URL and Key[/]");
            AnsiConsole.WriteLine();
            
            var setupNow = AnsiConsole.Confirm(
                "[yellow]Would you like to configure it now?[/]",
                true
            );

            if (setupNow)
            {
                AnsiConsole.MarkupLine("[yellow]Please run 'feathercli config setup' to configure the API[/]");
                return;
            }
            else
            {
                AnsiConsole.MarkupLine("[yellow]Migration cancelled. Please configure FeatherPanel API first.[/]");
                return;
            }
        }

        // Test FeatherPanel API connection
        AnsiConsole.MarkupLine("[yellow]Testing FeatherPanel API connection...[/]");
        
        try
        {
            var connectionValid = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Connecting to FeatherPanel...", async ctx =>
                {
                    return await apiClient.ValidateConnectionAsync();
                });

            if (!connectionValid)
            {
                AnsiConsole.MarkupLine("[red]✗ Failed to connect to FeatherPanel API[/]");
                AnsiConsole.MarkupLine("[yellow]Please verify your API URL and Key are correct[/]");
                AnsiConsole.MarkupLine("[yellow]You can check your configuration with 'feathercli config show'[/]");
                return;
            }

            // Get user session to display who we're authenticated as
            var session = await apiClient.GetUserSessionAsync();
            if (session?.UserInfo != null)
            {
                AnsiConsole.MarkupLine($"[green]✓ Connected to FeatherPanel as: [bold]{EscapeMarkup(session.UserInfo.Username)}[/][/]");
                
                // Verify user has admin.root permission
                if (session.Permissions == null || !session.Permissions.Contains("admin.root"))
                {
                    AnsiConsole.MarkupLine("[red]✗ Insufficient permissions[/]");
                    AnsiConsole.MarkupLine("[yellow]Migration requires admin.root permission[/]");
                    AnsiConsole.MarkupLine($"[yellow]Current permissions: {string.Join(", ", session.Permissions ?? new List<string>())}[/]");
                    AnsiConsole.MarkupLine("[yellow]Please use an API key with admin.root access[/]");
                    return;
                }
                
                AnsiConsole.MarkupLine("[green]✓ User has admin.root permission[/]");
            }
            else
            {
                AnsiConsole.MarkupLine("[red]✗ Failed to retrieve user session[/]");
                AnsiConsole.MarkupLine("[yellow]Cannot verify permissions without user session[/]");
                return;
            }
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ Error connecting to FeatherPanel API: {EscapeMarkup(ex.Message)}[/]");
            AnsiConsole.MarkupLine("[yellow]Please verify your API URL and Key are correct[/]");
            return;
        }

        // Check prerequisites for migration (only on fresh migration, not when resuming)
        var isResuming = _migrationState != null && _migrationState.CompletedSteps.Count > 0;
        
        if (!isResuming)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Checking if FeatherPanel is ready for migration...[/]");
            
            try
            {
                var prerequisites = await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .SpinnerStyle(Style.Parse("yellow"))
                    .StartAsync("Checking prerequisites...", async ctx =>
                    {
                        return await apiClient.CheckPrerequisitesAsync();
                    });

                if (prerequisites == null)
                {
                    AnsiConsole.MarkupLine("[red]✗ Failed to check prerequisites[/]");
                    AnsiConsole.MarkupLine("[yellow]Please verify your API permissions and try again[/]");
                    return;
                }

                if (prerequisites.Error)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Prerequisites check failed: {EscapeMarkup(prerequisites.ErrorMessage)}[/]");
                    return;
                }

                if (prerequisites.Data == null)
                {
                    AnsiConsole.MarkupLine("[red]✗ Invalid prerequisites response[/]");
                    return;
                }

                var data = prerequisites.Data;
                
                // Display prerequisites status
                AnsiConsole.WriteLine();
                AnsiConsole.MarkupLine("[bold]FeatherPanel Prerequisites:[/]");
                AnsiConsole.MarkupLine($"  Users: [green]{data.UsersCount}[/] (must be <= 1)");
                AnsiConsole.MarkupLine($"  Nodes: [green]{data.NodesCount}[/] (must be 0)");
                AnsiConsole.MarkupLine($"  Locations: [green]{data.LocationsCount}[/] (must be 0)");
                AnsiConsole.MarkupLine($"  Realms: [green]{data.RealmsCount}[/] (must be 0)");
                AnsiConsole.MarkupLine($"  Spells: [green]{data.SpellsCount}[/] (must be 0)");
                AnsiConsole.MarkupLine($"  Servers: [green]{data.ServersCount}[/] (must be 0)");
                AnsiConsole.MarkupLine($"  Databases: [green]{data.DatabasesCount}[/] (must be 0)");
                AnsiConsole.MarkupLine($"  Allocations: [green]{data.AllocationsCount}[/] (must be 0)");
                AnsiConsole.WriteLine();

                // Check if panel is clean
                if (!data.PanelClean)
                {
                    AnsiConsole.MarkupLine("[red]✗ FeatherPanel is not ready for migration[/]");
                    AnsiConsole.MarkupLine("[yellow]The panel must be clean (empty) before importing Pterodactyl data[/]");
                    AnsiConsole.WriteLine();
                    
                    var issues = new List<string>();
                    if (data.UsersCount > 1)
                        issues.Add($"Too many users ({data.UsersCount}, max 1)");
                    if (data.NodesCount > 0)
                        issues.Add($"Nodes exist ({data.NodesCount})");
                    if (data.LocationsCount > 0)
                        issues.Add($"Locations exist ({data.LocationsCount})");
                    if (data.RealmsCount > 0)
                        issues.Add($"Realms exist ({data.RealmsCount})");
                    if (data.SpellsCount > 0)
                        issues.Add($"Spells exist ({data.SpellsCount})");
                    if (data.ServersCount > 0)
                        issues.Add($"Servers exist ({data.ServersCount})");
                    if (data.DatabasesCount > 0)
                        issues.Add($"Databases exist ({data.DatabasesCount})");
                    if (data.AllocationsCount > 0)
                        issues.Add($"Allocations exist ({data.AllocationsCount})");

                    if (issues.Count > 0)
                    {
                        AnsiConsole.MarkupLine("[yellow]Issues found:[/]");
                        foreach (var issue in issues)
                        {
                            AnsiConsole.MarkupLine($"[yellow]  - {issue}[/]");
                        }
                    }

                    AnsiConsole.WriteLine();
                    AnsiConsole.MarkupLine("[yellow]Please clean up the panel before proceeding with migration[/]");
                    return;
                }

                AnsiConsole.MarkupLine("[green]✓ FeatherPanel is ready for migration[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ Error checking prerequisites: {EscapeMarkup(ex.Message)}[/]");
                AnsiConsole.MarkupLine("[yellow]Please verify your API permissions and try again[/]");
                return;
            }
        }
        else
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Skipping prerequisites check (resuming migration with existing data)[/]");
        }

        AnsiConsole.WriteLine();

        var migrationMode = ResolveMigrationMode(sqlDump, pterodactylDir, isResuming);
        if (migrationMode == null)
        {
            return;
        }

        PterodactylDatabaseService dbService;
        string pterodactylPath;

        if (migrationMode == "sql_dump")
        {
            var dumpReady = await SetupFromSqlDumpAsync(
                dbLogger,
                dumpLogger,
                isResuming,
                sqlDump,
                envFile,
                appKey,
                stagingDbHost,
                stagingDbPort,
                stagingDbUser,
                stagingDbPassword);

            if (!dumpReady || _pterodactylConfig == null)
            {
                return;
            }

            pterodactylPath = _migrationState?.SqlDumpPath ?? sqlDump ?? "sql-dump";
            dbService = new PterodactylDatabaseService(dbLogger);
        }
        else
        {
            var installReady = await SetupFromLocalInstallAsync(
                dbLogger,
                maintenanceLogger,
                isResuming,
                confirmBlueprint,
                pterodactylDir);

            if (!installReady || _pterodactylConfig == null)
            {
                return;
            }

            pterodactylPath = _migrationState?.PterodactylPath ?? pterodactylDir ?? "/var/www/pterodactyl";
            dbService = new PterodactylDatabaseService(dbLogger);
        }

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[green]✓ All checks completed successfully[/]");
        AnsiConsole.MarkupLine("[green]✓ Ready to start migration[/]");
        
        // Final confirmation before migration
        if (confirmMigrate)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]⚠  --confirm-migrate flag is set. Proceeding without final confirmation.[/]");
            AnsiConsole.MarkupLine("[bold red]⚠  CRITICAL NOTE:[/]");
            AnsiConsole.MarkupLine("[red]You MUST update Wings manually right after this migration script completes.[/]");
            AnsiConsole.MarkupLine("[red]The migration will import all data, but Wings configuration needs to be[/]");
            AnsiConsole.MarkupLine("[red]updated separately to connect to FeatherPanel.[/]");
            AnsiConsole.WriteLine();
        }
        else
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[bold yellow]⚠  IMPORTANT: Final Confirmation Required[/]");
            AnsiConsole.MarkupLine("[yellow]=====================================[/]");
            AnsiConsole.MarkupLine("[yellow]All validation checks have been completed and the system is ready[/]");
            AnsiConsole.MarkupLine("[yellow]to import data from Pterodactyl to FeatherPanel.[/]");
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[bold red]⚠  CRITICAL NOTE:[/]");
            AnsiConsole.MarkupLine("[red]You MUST update Wings manually right after this migration script completes.[/]");
            AnsiConsole.MarkupLine("[red]The migration will import all data, but Wings configuration needs to be[/]");
            AnsiConsole.MarkupLine("[red]updated separately to connect to FeatherPanel.[/]");
            AnsiConsole.WriteLine();
            
            var confirmMigration = AnsiConsole.Confirm(
                "[bold yellow]Do you want to proceed with the migration now?[/]",
                false
            );

            if (!confirmMigration)
            {
                await CleanupStagingDatabaseAsync();
                AnsiConsole.MarkupLine("[yellow]Migration cancelled by user.[/]");
                return;
            }
        }

        try
        {
            await RunMigrationStepsAsync(logger, dbService, apiClient, pterodactylPath);
            if (_migrationState?.Status == "completed")
            {
                await CleanupStagingDatabaseAsync();
            }
        }
        catch
        {
            AnsiConsole.MarkupLine("[yellow]Staging database kept for resume.[/]");
            throw;
        }
    }

    private string? ResolveMigrationMode(string? sqlDump, string? pterodactylDir, bool isResuming)
    {
        if (isResuming && !string.IsNullOrEmpty(_migrationState?.MigrationMode))
        {
            AnsiConsole.MarkupLine($"[yellow]Resuming in {_migrationState.MigrationMode} mode[/]");
            return _migrationState.MigrationMode;
        }

        if (!string.IsNullOrEmpty(sqlDump) && !string.IsNullOrEmpty(pterodactylDir))
        {
            AnsiConsole.MarkupLine("[red]✗ Use either --sql-dump or --pterodactyl-dir, not both[/]");
            return null;
        }

        if (!string.IsNullOrEmpty(sqlDump))
        {
            return "sql_dump";
        }

        if (!string.IsNullOrEmpty(pterodactylDir))
        {
            return "install";
        }

        var choice = AnsiConsole.Prompt(
            new SelectionPrompt<string>()
                .Title("How is Pterodactyl installed?")
                .AddChoices(
                    "Local installation",
                    "Docker / SQL dump"
                ));

        return choice.StartsWith("Docker", StringComparison.Ordinal) ? "sql_dump" : "install";
    }

    private async Task<bool> SetupFromSqlDumpAsync(
        ILogger<PterodactylDatabaseService>? dbLogger,
        ILogger<SqlDumpImportService>? dumpLogger,
        bool isResuming,
        string? sqlDump,
        string? envFile,
        string? appKey,
        string? stagingDbHost,
        string? stagingDbPort,
        string? stagingDbUser,
        string? stagingDbPassword)
    {
        AnsiConsole.MarkupLine("[bold blue]Source: SQL dump[/]");
        AnsiConsole.WriteLine();

        if (string.IsNullOrWhiteSpace(sqlDump))
        {
            if (isResuming && !string.IsNullOrEmpty(_migrationState?.SqlDumpPath))
            {
                sqlDump = _migrationState.SqlDumpPath;
                AnsiConsole.MarkupLine($"[yellow]Using saved SQL dump: {sqlDump}[/]");
            }
            else
            {
                sqlDump = AnsiConsole.Ask<string>("Path to Pterodactyl .sql dump:");
            }
        }

        sqlDump = Path.GetFullPath(sqlDump);
        if (!File.Exists(sqlDump))
        {
            AnsiConsole.MarkupLine($"[red]✗ SQL dump not found: {sqlDump}[/]");
            return false;
        }

        AnsiConsole.MarkupLine($"[green]✓ SQL dump: {sqlDump}[/]");

        if (string.IsNullOrWhiteSpace(envFile) && string.IsNullOrWhiteSpace(appKey))
        {
            if (isResuming && !string.IsNullOrEmpty(_migrationState?.EnvFilePath) && File.Exists(_migrationState.EnvFilePath))
            {
                envFile = _migrationState.EnvFilePath;
            }
            else
            {
                var keySource = AnsiConsole.Prompt(
                    new SelectionPrompt<string>()
                        .Title("Provide APP_KEY via:")
                        .AddChoices("Panel .env file", "Paste APP_KEY"));

                if (keySource.StartsWith("Panel", StringComparison.Ordinal))
                {
                    envFile = AnsiConsole.Ask<string>("Path to panel .env:");
                }
                else
                {
                    appKey = AnsiConsole.Prompt(
                        new TextPrompt<string>("APP_KEY:")
                            .Secret());
                }
            }
        }

        var configLoader = new ConfigurationLoader();
        try
        {
            if (!string.IsNullOrWhiteSpace(envFile))
            {
                envFile = Path.GetFullPath(envFile);
                if (!File.Exists(envFile))
                {
                    AnsiConsole.MarkupLine($"[red]✗ .env file not found: {envFile}[/]");
                    return false;
                }

                _pterodactylConfig = configLoader.LoadFromEnvFile(envFile);
                AnsiConsole.MarkupLine($"[green]✓ Loaded configuration from {envFile}[/]");
            }
            else
            {
                _pterodactylConfig = configLoader.LoadFromAppKey(appKey!);
                AnsiConsole.MarkupLine("[green]✓ Using provided APP_KEY[/]");
            }
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ Failed to load configuration: {EscapeMarkup(ex.Message)}[/]");
            return false;
        }

        if (string.IsNullOrWhiteSpace(_pterodactylConfig.AppKey))
        {
            AnsiConsole.MarkupLine("[red]✗ APP_KEY is required[/]");
            AnsiConsole.MarkupLine("[dim]  docker compose exec panel cat /app/var/.env > panel.env[/]");
            return false;
        }

        if (!isResuming)
        {
            var configDisplay = new ConfigurationDisplay();
            configDisplay.DisplayConfiguration(_pterodactylConfig);
        }

        _stagingDbOptions = new StagingDatabaseOptions
        {
            Host = string.IsNullOrWhiteSpace(stagingDbHost)
                ? AnsiConsole.Ask("Staging MySQL host:", "127.0.0.1")
                : stagingDbHost,
            Port = string.IsNullOrWhiteSpace(stagingDbPort)
                ? AnsiConsole.Ask("Staging MySQL port:", "3306")
                : stagingDbPort,
            Username = string.IsNullOrWhiteSpace(stagingDbUser)
                ? AnsiConsole.Ask("Staging MySQL username:", "root")
                : stagingDbUser,
            Password = stagingDbPassword ?? AnsiConsole.Prompt(
                new TextPrompt<string>("Staging MySQL password:")
                    .AllowEmpty()
                    .Secret())
        };

        _sqlDumpImportService = new SqlDumpImportService(dumpLogger);

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[yellow]Testing staging MySQL connection...[/]");
        try
        {
            await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Connecting to staging MySQL...", async _ =>
                {
                    await _sqlDumpImportService.TestStagingConnectionAsync(_stagingDbOptions);
                });
            AnsiConsole.MarkupLine("[green]✓ Staging MySQL connection OK[/]");
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ Cannot connect to staging MySQL: {EscapeMarkup(ex.Message)}[/]");
            return false;
        }

        var reuseStaging = isResuming
            && !string.IsNullOrEmpty(_migrationState?.StagingDatabase)
            && await _sqlDumpImportService.StagingDatabaseExistsAsync(_stagingDbOptions, _migrationState!.StagingDatabase!);

        if (reuseStaging)
        {
            _stagingDatabaseName = _migrationState!.StagingDatabase;
            _ownsStagingDatabase = true;
            AnsiConsole.MarkupLine($"[green]✓ Reusing staging database: {_stagingDatabaseName}[/]");
        }
        else
        {
            try
            {
                _stagingDatabaseName = await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .SpinnerStyle(Style.Parse("yellow"))
                    .StartAsync("Creating staging database...", async _ =>
                        await _sqlDumpImportService.CreateStagingDatabaseAsync(_stagingDbOptions));

                _ownsStagingDatabase = true;
                AnsiConsole.MarkupLine($"[green]✓ Created staging database: {_stagingDatabaseName}[/]");

                await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .SpinnerStyle(Style.Parse("yellow"))
                    .StartAsync("Importing SQL dump...", async _ =>
                        await _sqlDumpImportService.ImportDumpAsync(sqlDump, _stagingDbOptions, _stagingDatabaseName!));

                AnsiConsole.MarkupLine("[green]✓ SQL dump imported[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ Failed to import SQL dump: {EscapeMarkup(ex.Message)}[/]");
                await CleanupStagingDatabaseAsync();
                return false;
            }
        }

        configLoader.ApplyStagingDatabase(_pterodactylConfig, _stagingDbOptions, _stagingDatabaseName!);

        if (_migrationState != null)
        {
            _migrationState.MigrationMode = "sql_dump";
            _migrationState.SqlDumpPath = sqlDump;
            _migrationState.EnvFilePath = envFile;
            _migrationState.StagingDatabase = _stagingDatabaseName;
            _migrationState.PterodactylPath = sqlDump;
            _progressService?.SaveProgress(_migrationState);
        }

        UpdateProgress("SQL dump loaded", pterodactylPath: sqlDump);

        var dbService = new PterodactylDatabaseService(dbLogger);
        return await VerifySourceDatabaseAsync(dbService);
    }

    private async Task<bool> SetupFromLocalInstallAsync(
        ILogger<PterodactylDatabaseService>? dbLogger,
        ILogger<PterodactylMaintenanceService>? maintenanceLogger,
        bool isResuming,
        bool confirmBlueprint,
        string? pterodactylDir)
    {
        AnsiConsole.MarkupLine("[bold blue]Source: local Pterodactyl installation[/]");
        AnsiConsole.WriteLine();

        string pterodactylPath;
        if (!string.IsNullOrEmpty(pterodactylDir))
        {
            pterodactylPath = Path.GetFullPath(pterodactylDir);
            AnsiConsole.MarkupLine($"[yellow]Using Pterodactyl directory from --pterodactyl-dir: {pterodactylPath}[/]");
        }
        else if (isResuming && !string.IsNullOrEmpty(_migrationState?.PterodactylPath))
        {
            pterodactylPath = _migrationState.PterodactylPath;
            AnsiConsole.MarkupLine($"[yellow]Using saved Pterodactyl directory: {pterodactylPath}[/]");
        }
        else
        {
            pterodactylPath = Path.GetFullPath(AnsiConsole.Ask(
                "Enter the Pterodactyl installation path:",
                "/var/www/pterodactyl"));
        }

        UpdateProgress("Validating Pterodactyl Installation", pterodactylPath: pterodactylPath);

        if (_migrationState != null)
        {
            _migrationState.MigrationMode = "install";
            _migrationState.PterodactylPath = pterodactylPath;
            _progressService?.SaveProgress(_migrationState);
        }

        if (!isResuming)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[yellow]Validating Pterodactyl installation at: {pterodactylPath}[/]");

            if (!Directory.Exists(pterodactylPath))
            {
                AnsiConsole.MarkupLine($"[red]✗ Directory does not exist: {pterodactylPath}[/]");
                return false;
            }

            var validator = new PterodactylInstallationValidator();
            var validationResult = validator.ValidateInstallation(pterodactylPath);

            if (!validationResult.IsValid)
            {
                AnsiConsole.MarkupLine($"[red]✗ Invalid Pterodactyl installation: {EscapeMarkup(validationResult.ErrorMessage)}[/]");
                return false;
            }

            AnsiConsole.MarkupLine("[green]✓ Valid Pterodactyl installation detected[/]");

            if (validator.CheckBlueprintDirectory(pterodactylPath))
            {
                if (confirmBlueprint)
                {
                    AnsiConsole.MarkupLine("[yellow]⚠  Blueprint directory detected, but --confirm-blueprint flag is set. Proceeding without confirmation.[/]");
                }
                else
                {
                    var blueprintWarning = new BlueprintWarningDisplay();
                    if (!blueprintWarning.ShowWarningAndConfirm())
                    {
                        AnsiConsole.MarkupLine("[yellow]Migration cancelled by user.[/]");
                        return false;
                    }
                }
            }
        }
        else
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Skipping Pterodactyl validation (resuming migration)[/]");
        }

        AnsiConsole.WriteLine();

        var envFilePath = Path.Combine(pterodactylPath, ".env");
        if (!File.Exists(envFilePath))
        {
            AnsiConsole.MarkupLine($"[red]✗ .env file not found at: {envFilePath}[/]");
            return false;
        }

        AnsiConsole.MarkupLine(isResuming
            ? "[yellow]Reloading configuration from .env file...[/]"
            : "[yellow]Reading configuration from .env file...[/]");

        var configLoader = new ConfigurationLoader();
        try
        {
            _pterodactylConfig = configLoader.LoadFromEnvFile(envFilePath);
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ Failed to load configuration: {EscapeMarkup(ex.Message)}[/]");
            return false;
        }

        if (!isResuming)
        {
            var configDisplay = new ConfigurationDisplay();
            configDisplay.DisplayConfiguration(_pterodactylConfig);
        }

        var dbService = new PterodactylDatabaseService(dbLogger);
        if (!await VerifySourceDatabaseAsync(dbService))
        {
            return false;
        }

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[yellow]Checking Pterodactyl maintenance mode...[/]");

        var maintenanceService = new PterodactylMaintenanceService(maintenanceLogger);
        if (maintenanceService.IsInMaintenanceMode(pterodactylPath))
        {
            AnsiConsole.MarkupLine("[green]✓ Pterodactyl is already in maintenance mode[/]");
            return true;
        }

        AnsiConsole.MarkupLine("[yellow]Pterodactyl is not in maintenance mode. Attempting to set it...[/]");

        try
        {
            var maintenanceSet = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Setting maintenance mode...", async _ =>
                    await maintenanceService.SetMaintenanceModeAsync(pterodactylPath));

            if (maintenanceSet)
            {
                AnsiConsole.MarkupLine("[green]✓ Successfully set Pterodactyl to maintenance mode[/]");
                return true;
            }

            AnsiConsole.MarkupLine("[red]✗ Failed to set Pterodactyl to maintenance mode[/]");
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ Error setting maintenance mode: {EscapeMarkup(ex.Message)}[/]");
        }

        AnsiConsole.MarkupLine("[yellow]Please manually put Pterodactyl into maintenance mode with:[/]");
        AnsiConsole.MarkupLine($"[yellow]  cd {pterodactylPath}[/]");
        AnsiConsole.MarkupLine("[yellow]  php artisan down[/]");
        AnsiConsole.MarkupLine("[yellow]Then try the migrator tool again[/]");
        return false;
    }

    private async Task<bool> VerifySourceDatabaseAsync(PterodactylDatabaseService dbService)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[yellow]Testing database connection...[/]");

        try
        {
            var connectionTest = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Connecting to database...", async _ =>
                    await dbService.TestConnectionAsync(_pterodactylConfig!));

            if (connectionTest)
            {
                AnsiConsole.MarkupLine("[green]✓ Successfully connected to Pterodactyl database[/]");
            }
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ Failed to connect to database: {EscapeMarkup(ex.Message)}[/]");
            AnsiConsole.MarkupLine("[yellow]Please verify your database credentials[/]");
            return false;
        }

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[yellow]Checking for required database tables...[/]");

        try
        {
            var tableCheckResult = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Checking tables...", async _ =>
                    await dbService.CheckRequiredTablesAsync(_pterodactylConfig!));

            if (tableCheckResult.AllTablesExist)
            {
                AnsiConsole.MarkupLine($"[green]✓ All {tableCheckResult.ExistingTables.Count} required tables found[/]");
            }
            else
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Found {tableCheckResult.ExistingTables.Count} of {PterodactylDatabaseService.GetRequiredTables().Length} required tables[/]");
                AnsiConsole.MarkupLine($"[red]✗ Missing {tableCheckResult.MissingTables.Count} required table(s):[/]");

                foreach (var missingTable in tableCheckResult.MissingTables)
                {
                    AnsiConsole.MarkupLine($"[red]  - {missingTable}[/]");
                }

                AnsiConsole.WriteLine();
                if (!AnsiConsole.Confirm("[yellow]Some required tables are missing. Do you want to continue anyway?[/]", false))
                {
                    AnsiConsole.MarkupLine("[yellow]Migration cancelled by user.[/]");
                    return false;
                }
            }
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ Failed to check required tables: {EscapeMarkup(ex.Message)}[/]");
            AnsiConsole.MarkupLine("[yellow]Please verify your database connection and permissions[/]");
            return false;
        }

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[yellow]Reading application settings...[/]");

        try
        {
            var appName = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Loading settings...", async _ =>
                    await dbService.GetSettingValueAsync(_pterodactylConfig!, "settings::app:name"));

            if (!string.IsNullOrEmpty(appName))
            {
                AnsiConsole.MarkupLine($"[green]✓ Pterodactyl Panel Name: [bold]{EscapeMarkup(appName)}[/][/]");
            }
            else
            {
                AnsiConsole.MarkupLine("[yellow]⚠  App name not found in settings (settings::app:name)[/]");
            }
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[yellow]⚠  Could not read app name: {EscapeMarkup(ex.Message)}[/]");
        }

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[green]✓ Configuration loaded and ready for migration[/]");
        return true;
    }

    private async Task CleanupStagingDatabaseAsync()
    {
        if (!_ownsStagingDatabase ||
            _sqlDumpImportService == null ||
            _stagingDbOptions == null ||
            string.IsNullOrEmpty(_stagingDatabaseName))
        {
            return;
        }

        try
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[yellow]Cleaning up staging database {_stagingDatabaseName}...[/]");
            await _sqlDumpImportService.DropStagingDatabaseAsync(_stagingDbOptions, _stagingDatabaseName);
            AnsiConsole.MarkupLine("[green]✓ Staging database removed[/]");

            if (_migrationState != null)
            {
                _migrationState.StagingDatabase = null;
                _progressService?.SaveProgress(_migrationState);
            }
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[yellow]⚠  Could not drop staging database: {EscapeMarkup(ex.Message)}[/]");
            AnsiConsole.MarkupLine($"[dim]You can drop it manually: DROP DATABASE `{_stagingDatabaseName}`;[/]");
        }
        finally
        {
            _ownsStagingDatabase = false;
            _stagingDatabaseName = null;
        }
    }

    private async Task RunMigrationStepsAsync(
        ILogger<MigrateCommandModule>? logger,
        PterodactylDatabaseService dbService,
        FeatherPanelApiClient apiClient,
        string pterodactylPath)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold green]Starting migration...[/]");
        AnsiConsole.MarkupLine("[dim]Remember: Update Wings after migration completes![/]");
        AnsiConsole.WriteLine();
        
        // Step 1: Migrate Settings
        await ExecuteStep("Step 1: Migrating Panel Settings", "migrate_settings", async () =>
        {
            AnsiConsole.MarkupLine("[yellow]Preparing settings from Pterodactyl...[/]");
            
            var settingsService = new SettingsMigrationService(dbService);
            var settingsRequest = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Preparing settings...", async ctx =>
                {
                    return await settingsService.PrepareSettingsAsync(_pterodactylConfig);
                });

            // Show preview of what will be imported
            var previewDisplay = new SettingsPreviewDisplay();
            previewDisplay.DisplaySettingsPreview(settingsRequest);

            // Countdown with cancellation option
            AnsiConsole.MarkupLine("[bold yellow]Going to import the settings into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[yellow]You can cancel by pressing Ctrl+C[/]");
            AnsiConsole.WriteLine();

            // Simple countdown
            try
            {
                for (int i = 3; i > 0; i--)
                {
                    AnsiConsole.MarkupLine($"[bold yellow]{i}...[/]");
                    await Task.Delay(1000);
                }
            }
            catch (OperationCanceledException)
            {
                AnsiConsole.MarkupLine("[yellow]Import cancelled by user[/]");
                throw new Exception("Import cancelled by user");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Updating FeatherPanel settings...[/]");
            
            var settingsResponse = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Updating settings...", async ctx =>
                {
                    return await apiClient.UpdateSettingsAsync(settingsRequest);
                });

            if (settingsResponse == null)
            {
                throw new Exception("Failed to update settings - API returned null response");
            }

            if (settingsResponse.Error || !settingsResponse.Success)
            {
                var errorMsg = settingsResponse.ErrorMessage ?? "Unknown error occurred";
                throw new Exception($"Settings update failed: {errorMsg}");
            }

            AnsiConsole.MarkupLine($"[green]✓ Settings updated successfully[/]");
            if (settingsResponse.UpdatedSettings != null && settingsResponse.UpdatedSettings.Count > 0)
            {
                AnsiConsole.MarkupLine($"[green]  Updated {settingsResponse.UpdatedSettings.Count} setting(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["updated_settings_count"] = settingsResponse.UpdatedSettings?.Count ?? 0,
                ["updated_settings"] = settingsResponse.UpdatedSettings ?? new List<string>()
            };
        });

        // Step 2: Import Locations
        await ExecuteStep("Step 2: Importing Locations", "import_locations", async () =>
        {
            AnsiConsole.MarkupLine("[yellow]Reading locations from Pterodactyl database...[/]");
            
            var locations = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Reading locations...", async ctx =>
                {
                    return await dbService.GetLocationsAsync(_pterodactylConfig);
                });

            if (locations.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No locations found in Pterodactyl database[/]");
                return new Dictionary<string, object>
                {
                    ["locations_count"] = 0,
                    ["imported_count"] = 0
                };
            }

            // Display locations preview
            var locationsDisplay = new LocationsDisplay();
            locationsDisplay.DisplayLocations(locations);

            AnsiConsole.MarkupLine($"[yellow]Found {locations.Count} location(s) that will be imported to FeatherPanel[/]");
            AnsiConsole.WriteLine();

            // Countdown with cancellation option
            AnsiConsole.MarkupLine("[bold yellow]Going to import the locations into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[yellow]You can cancel by pressing Ctrl+C[/]");
            AnsiConsole.WriteLine();

            // Simple countdown
            try
            {
                for (int i = 3; i > 0; i--)
                {
                    AnsiConsole.MarkupLine($"[bold yellow]{i}...[/]");
                    await Task.Delay(1000);
                }
            }
            catch (OperationCanceledException)
            {
                AnsiConsole.MarkupLine("[yellow]Import cancelled by user[/]");
                throw new Exception("Import cancelled by user");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Importing locations to FeatherPanel...[/]");

            var importedCount = 0;
            var failedCount = 0;
            var importedLocationIds = new List<int>();

            foreach (var location in locations)
            {
                try
                {
                    var createRequest = new LocationCreateRequest
                    {
                        Name = location.Short,
                        Description = location.Long,
                        Id = location.Id, // Preserve Pterodactyl location ID for WHMCS and other services
                        Type = "game"
                    };

                    var response = await apiClient.CreateLocationAsync(createRequest);

                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import location '{EscapeMarkup(location.Short)}' (ID: {location.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        var locationId = response.Data?.Location?.Id ?? 0;
                        if (locationId > 0)
                        {
                            // Verify the ID matches what we requested (should be the same as Pterodactyl ID)
                            if (locationId == location.Id)
                            {
                                AnsiConsole.MarkupLine($"[green]✓ Imported location '{EscapeMarkup(location.Short)}' (ID: {location.Id} - preserved)[/]");
                            }
                            else
                            {
                                AnsiConsole.MarkupLine($"[yellow]⚠  Imported location '{EscapeMarkup(location.Short)}' (Pterodactyl ID: {location.Id} → FeatherPanel ID: {locationId}) - ID changed[/]");
                            }
                            importedCount++;
                            importedLocationIds.Add(locationId);
                        }
                        else
                        {
                            AnsiConsole.MarkupLine($"[yellow]⚠  Imported location '{EscapeMarkup(location.Short)}' (ID: {location.Id}) but location ID was not returned[/]");
                            importedCount++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing location '{EscapeMarkup(location.Short)}' (ID: {location.Id}): {EscapeMarkup(ex.Message)}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} location(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} location(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["locations_count"] = locations.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["imported_location_ids"] = importedLocationIds,
                ["pterodactyl_location_ids"] = locations.Select(l => l.Id).ToList()
            };
        });

        // Step 3: Import Nests (Realms)
        await ExecuteStep("Step 3: Importing Nests (Realms)", "import_nests", async () =>
        {
            AnsiConsole.MarkupLine("[yellow]Reading nests from Pterodactyl database...[/]");
            
            var nests = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Reading nests...", async ctx =>
                {
                    return await dbService.GetNestsAsync(_pterodactylConfig);
                });

            if (nests.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No nests found in Pterodactyl database[/]");
                return new Dictionary<string, object>
                {
                    ["nests_count"] = 0,
                    ["imported_count"] = 0
                };
            }

            // Display nests preview
            var nestsDisplay = new NestsDisplay();
            nestsDisplay.DisplayNests(nests);

            AnsiConsole.MarkupLine($"[yellow]Found {nests.Count} nest(s) that will be imported to FeatherPanel as realms[/]");
            AnsiConsole.WriteLine();

            // Countdown with cancellation option
            AnsiConsole.MarkupLine("[bold yellow]Going to import the nests into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[yellow]You can cancel by pressing Ctrl+C[/]");
            AnsiConsole.WriteLine();

            // Simple countdown
            try
            {
                for (int i = 3; i > 0; i--)
                {
                    AnsiConsole.MarkupLine($"[bold yellow]{i}...[/]");
                    await Task.Delay(1000);
                }
            }
            catch (OperationCanceledException)
            {
                AnsiConsole.MarkupLine("[yellow]Import cancelled by user[/]");
                throw new Exception("Import cancelled by user");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Importing nests to FeatherPanel as realms...[/]");

            var importedCount = 0;
            var failedCount = 0;
            var importedRealmIds = new List<int>();
            var nestToRealmMapping = new Dictionary<int, int>();

            foreach (var nest in nests)
            {
                try
                {
                    var createRequest = new RealmCreateRequest
                    {
                        Name = nest.Name,
                        Description = nest.Description,
                        Id = nest.Id // Preserve Pterodactyl nest ID for WHMCS and other services
                    };

                    var response = await apiClient.CreateRealmAsync(createRequest);

                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import nest '{EscapeMarkup(nest.Name)}' (ID: {nest.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        importedCount++;
                        var realmId = response.Data?.Realm?.Id ?? 0;
                        if (realmId > 0)
                        {
                            // Verify the ID matches what we requested (should be the same as Pterodactyl nest ID)
                            if (realmId == nest.Id)
                            {
                                AnsiConsole.MarkupLine($"[green]✓ Imported nest '{EscapeMarkup(nest.Name)}' (ID: {nest.Id} - preserved as Realm)[/]");
                            }
                            else
                            {
                                AnsiConsole.MarkupLine($"[yellow]⚠  Imported nest '{EscapeMarkup(nest.Name)}' (Pterodactyl ID: {nest.Id} → Realm ID: {realmId}) - ID changed[/]");
                            }
                            importedRealmIds.Add(realmId);
                            nestToRealmMapping[nest.Id] = realmId;
                        }
                        else
                        {
                            AnsiConsole.MarkupLine($"[yellow]⚠  Imported nest '{EscapeMarkup(nest.Name)}' (ID: {nest.Id}) but realm ID was not returned in response[/]");
                            AnsiConsole.MarkupLine($"[dim]  Response: Success={response.Success}, Data={response.Data != null}, Realm={response.Data?.Realm != null}[/]");
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing nest '{EscapeMarkup(nest.Name)}' (ID: {nest.Id}): {EscapeMarkup(ex.Message)}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} nest(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} nest(s)[/]");
            }
            
            if (nestToRealmMapping.Count == 0 && importedCount > 0)
            {
                AnsiConsole.MarkupLine("[red]✗ WARNING: No realm IDs were captured during import![/]");
                AnsiConsole.MarkupLine("[yellow]This means the API response didn't include realm IDs. The mapping cannot be created.[/]");
                AnsiConsole.MarkupLine("[yellow]You may need to manually map nests to realms or check the API response format.[/]");
            }
            else if (nestToRealmMapping.Count < importedCount)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  WARNING: Only {nestToRealmMapping.Count} out of {importedCount} realm IDs were captured.[/]");
            }
            else
            {
                AnsiConsole.MarkupLine($"[green]✓ Successfully mapped {nestToRealmMapping.Count} nest(s) to realm(s)[/]");
            }

            // Convert dictionary to a format that can be serialized to JSON
            var nestToRealmMappingDict = nestToRealmMapping.ToDictionary(
                kvp => kvp.Key.ToString(),
                kvp => (object)kvp.Value
            );

            return new Dictionary<string, object>
            {
                ["nests_count"] = nests.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["imported_realm_ids"] = importedRealmIds,
                ["pterodactyl_nest_ids"] = nests.Select(n => n.Id).ToList(),
                ["nest_to_realm_mapping"] = nestToRealmMappingDict
            };
        });

        // Step 4: Import Eggs (Spells)
        await ExecuteStep("Step 4: Importing Eggs (Spells)", "import_eggs", async () =>
        {
            AnsiConsole.MarkupLine("[yellow]Reading eggs with variables from Pterodactyl database...[/]");
            
            var eggs = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Reading eggs...", async ctx =>
                {
                    return await dbService.GetEggsWithVariablesAsync(_pterodactylConfig);
                });

            if (eggs.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No eggs found in Pterodactyl database[/]");
                return new Dictionary<string, object>
                {
                    ["eggs_count"] = 0,
                    ["imported_count"] = 0
                };
            }

            // Build nest to realm mapping from migration progress
            var nestToRealmMapping = new Dictionary<int, int>();
            
            // Try to get mapping from dictionary first
            if (_migrationState?.StepDetails.ContainsKey("nest_to_realm_mapping") == true)
            {
                var mappingData = _migrationState.StepDetails["nest_to_realm_mapping"];
                
                // Handle JsonElement (when deserialized from JSON)
                if (mappingData is JsonElement mappingJson)
                {
                    try
                    {
                        var dict = JsonSerializer.Deserialize<Dictionary<string, int>>(mappingJson.GetRawText());
                        if (dict != null)
                        {
                            foreach (var kvp in dict)
                            {
                                if (int.TryParse(kvp.Key, out var nestId))
                                {
                                    nestToRealmMapping[nestId] = kvp.Value;
                                }
                            }
                        }
                    }
                    catch
                    {
                        // Try parsing as Dictionary<string, object> if int deserialization fails
                        var dictObj = JsonSerializer.Deserialize<Dictionary<string, object>>(mappingJson.GetRawText());
                        if (dictObj != null)
                        {
                            foreach (var kvp in dictObj)
                            {
                                if (int.TryParse(kvp.Key, out var nestId) && kvp.Value != null)
                                {
                                    var realmId = Convert.ToInt32(kvp.Value);
                                    nestToRealmMapping[nestId] = realmId;
                                }
                            }
                        }
                    }
                }
                // Handle Dictionary<string, object> (when already parsed)
                else if (mappingData is Dictionary<string, object> mappingDict && mappingDict.Count > 0)
                {
                    foreach (var kvp in mappingDict)
                    {
                        if (int.TryParse(kvp.Key, out var nestId) && kvp.Value != null)
                        {
                            var realmId = Convert.ToInt32(kvp.Value);
                            nestToRealmMapping[nestId] = realmId;
                        }
                    }
                }
                // Handle Dictionary<string, int> (direct type)
                else if (mappingData is Dictionary<string, int> directDict)
                {
                    foreach (var kvp in directDict)
                    {
                        if (int.TryParse(kvp.Key, out var nestId))
                        {
                            nestToRealmMapping[nestId] = kvp.Value;
                        }
                    }
                }
            }
            
            // Fallback: Try to rebuild from lists if dictionary is empty
            if (nestToRealmMapping.Count == 0 && 
                _migrationState?.StepDetails.ContainsKey("imported_realm_ids") == true &&
                _migrationState.StepDetails.ContainsKey("pterodactyl_nest_ids") == true)
            {
                var importedRealmIds = _migrationState.StepDetails["imported_realm_ids"];
                var pterodactylNestIds = _migrationState.StepDetails["pterodactyl_nest_ids"];
                
                List<int>? realmIdsList = null;
                List<int>? nestIdsList = null;
                
                // Handle JsonElement (when deserialized from JSON)
                if (importedRealmIds is JsonElement realmIdsJson)
                {
                    realmIdsList = JsonSerializer.Deserialize<List<int>>(realmIdsJson.GetRawText());
                }
                else if (importedRealmIds is List<object> realmIdsObjList)
                {
                    realmIdsList = realmIdsObjList.Select(x => Convert.ToInt32(x)).ToList();
                }
                else if (importedRealmIds is List<int> realmIdsIntList)
                {
                    realmIdsList = realmIdsIntList;
                }
                
                if (pterodactylNestIds is JsonElement nestIdsJson)
                {
                    nestIdsList = JsonSerializer.Deserialize<List<int>>(nestIdsJson.GetRawText());
                }
                else if (pterodactylNestIds is List<object> nestIdsObjList)
                {
                    nestIdsList = nestIdsObjList.Select(x => Convert.ToInt32(x)).ToList();
                }
                else if (pterodactylNestIds is List<int> nestIdsIntList)
                {
                    nestIdsList = nestIdsIntList;
                }
                
                if (realmIdsList != null && nestIdsList != null &&
                    realmIdsList.Count > 0 &&
                    realmIdsList.Count == nestIdsList.Count)
                {
                    AnsiConsole.MarkupLine("[yellow]⚠  Rebuilding nest to realm mapping from lists...[/]");
                    for (int i = 0; i < realmIdsList.Count; i++)
                    {
                        nestToRealmMapping[nestIdsList[i]] = realmIdsList[i];
                    }
                }
            }

            if (nestToRealmMapping.Count == 0)
            {
                AnsiConsole.MarkupLine("[red]✗ No nest to realm mapping found.[/]");
                AnsiConsole.WriteLine();
                AnsiConsole.MarkupLine("[yellow]This usually happens if:[/]");
                AnsiConsole.MarkupLine("[yellow]  1. Nests were imported before the mapping feature was added[/]");
                AnsiConsole.MarkupLine("[yellow]  2. The nest import step failed or was interrupted[/]");
                AnsiConsole.MarkupLine("[yellow]  3. The migration progress file is corrupted[/]");
                AnsiConsole.WriteLine();
                AnsiConsole.MarkupLine("[bold yellow]Solution:[/]");
                AnsiConsole.MarkupLine("[yellow]You need to re-run the nest import step. You can either:[/]");
                AnsiConsole.MarkupLine("[yellow]  1. Delete the progress file and run the full migration again[/]");
                AnsiConsole.MarkupLine("[yellow]  2. Manually create the mapping by importing nests again[/]");
                AnsiConsole.WriteLine();
                AnsiConsole.MarkupLine($"[dim]Progress file: {_progressService?.GetProgressFilePath()}[/]");
                throw new Exception("Nest to realm mapping not found. Please re-run the nest import step.");
            }
            
            AnsiConsole.MarkupLine($"[green]✓ Found {nestToRealmMapping.Count} nest to realm mapping(s)[/]");

            // Display eggs preview
            var eggsDisplay = new EggsDisplay();
            eggsDisplay.DisplayEggs(eggs);

            var totalVariables = eggs.Sum(e => e.Variables.Count);
            AnsiConsole.MarkupLine($"[yellow]Found {eggs.Count} egg(s) with {totalVariables} total variable(s) that will be imported to FeatherPanel as spells[/]");
            AnsiConsole.WriteLine();

            // Countdown with cancellation option
            AnsiConsole.MarkupLine("[bold yellow]Going to import the eggs into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[yellow]You can cancel by pressing Ctrl+C[/]");
            AnsiConsole.WriteLine();

            // Simple countdown
            try
            {
                for (int i = 3; i > 0; i--)
                {
                    AnsiConsole.MarkupLine($"[bold yellow]{i}...[/]");
                    await Task.Delay(1000);
                }
            }
            catch (OperationCanceledException)
            {
                AnsiConsole.MarkupLine("[yellow]Import cancelled by user[/]");
                throw new Exception("Import cancelled by user");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Importing eggs to FeatherPanel as spells...[/]");

            var importedCount = 0;
            var failedCount = 0;
            var importedSpellIds = new List<int>();
            var totalVariablesImported = 0;

            foreach (var egg in eggs)
            {
                try
                {
                    // Check if we have a mapping for this nest
                    if (!nestToRealmMapping.ContainsKey(egg.NestId))
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Skipping egg '{EscapeMarkup(egg.Name)}' (ID: {egg.Id}) - No realm mapping for nest ID {egg.NestId}[/]");
                        failedCount++;
                        continue;
                    }

                    var realmId = nestToRealmMapping[egg.NestId];

                    // Build the nest to realm mapping dictionary for this request
                    var requestMapping = new Dictionary<string, int>
                    {
                        [egg.NestId.ToString()] = realmId
                    };

                    var eggData = new EggData
                    {
                        Id = egg.Id,
                        Uuid = egg.Uuid,
                        NestId = egg.NestId,
                        Author = egg.Author,
                        Name = egg.Name,
                        Description = egg.Description,
                        Features = egg.Features,
                        DockerImages = egg.DockerImages,
                        FileDenylist = egg.FileDenylist,
                        UpdateUrl = egg.UpdateUrl,
                        ConfigFiles = egg.ConfigFiles,
                        ConfigStartup = egg.ConfigStartup,
                        ConfigLogs = egg.ConfigLogs,
                        ConfigStop = egg.ConfigStop,
                        Startup = egg.Startup,
                        ScriptContainer = egg.ScriptContainer,
                        ScriptEntry = egg.ScriptEntry,
                        ScriptIsPrivileged = egg.ScriptIsPrivileged,
                        ScriptInstall = egg.ScriptInstall,
                        ForceOutgoingIp = egg.ForceOutgoingIp,
                        ConfigFrom = egg.ConfigFrom,
                        CopyScriptFrom = egg.CopyScriptFrom
                    };

                    var variables = egg.Variables.Select(v => new SpellVariableData
                    {
                        Id = v.Id,
                        Name = v.Name,
                        Description = v.Description,
                        EnvVariable = v.EnvVariable,
                        DefaultValue = v.DefaultValue,
                        UserViewable = v.UserViewable,
                        UserEditable = v.UserEditable,
                        Rules = v.Rules
                    }).ToList();
                    
                    // Debug: Log variable count
                    if (variables.Count > 0)
                    {
                        logger?.LogDebug("Egg '{EggName}' (ID: {EggId}) has {VarCount} variables to import", egg.Name, egg.Id, variables.Count);
                    }

                    var importRequest = new EggImportRequest
                    {
                        Egg = eggData,
                        Variables = variables,
                        NestToRealmMapping = requestMapping
                    };

                    var response = await apiClient.ImportEggAsync(importRequest);

                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import egg '{EscapeMarkup(egg.Name)}' (ID: {egg.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        var spellId = response.Data?.Spell?.Id ?? 0;
                        var varsImported = response.Data?.VariablesImported ?? 0;
                        
                        if (spellId > 0)
                        {
                            // Verify the ID matches what we requested (should be the same as Pterodactyl egg ID)
                            if (spellId == egg.Id)
                            {
                                AnsiConsole.MarkupLine($"[green]✓ Imported egg '{EscapeMarkup(egg.Name)}' (ID: {egg.Id} - preserved as Spell) with {varsImported} variable(s)[/]");
                            }
                            else
                            {
                                AnsiConsole.MarkupLine($"[yellow]⚠  Imported egg '{EscapeMarkup(egg.Name)}' (Pterodactyl ID: {egg.Id} → Spell ID: {spellId}) - ID changed, with {varsImported} variable(s)[/]");
                            }
                            if (egg.Variables.Count > 0 && varsImported == 0)
                            {
                                AnsiConsole.MarkupLine($"[yellow]  ⚠  Warning: Egg has {egg.Variables.Count} variable(s) but 0 were imported[/]");
                                if (response.Data?.VariableErrors != null && response.Data.VariableErrors.Count > 0)
                                {
                                    foreach (var error in response.Data.VariableErrors)
                                    {
                                        AnsiConsole.MarkupLine($"[dim]    Error: {EscapeMarkup(error)}[/]");
                                    }
                                }
                            }
                            importedCount++;
                            totalVariablesImported += varsImported;
                            importedSpellIds.Add(spellId);
                        }
                        else
                        {
                            AnsiConsole.MarkupLine($"[yellow]⚠  Imported egg '{EscapeMarkup(egg.Name)}' (ID: {egg.Id}) but spell ID was not returned[/]");
                            importedCount++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing egg '{EscapeMarkup(egg.Name)}' (ID: {egg.Id}): {EscapeMarkup(ex.Message)}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} egg(s) with {totalVariablesImported} total variable(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} egg(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["eggs_count"] = eggs.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["imported_spell_ids"] = importedSpellIds,
                ["total_variables_imported"] = totalVariablesImported,
                ["pterodactyl_egg_ids"] = eggs.Select(e => e.Id).ToList()
            };
        });

        // Step 5: Import Nodes
        await ExecuteStep("Step 5: Importing Nodes", "import_nodes", async () =>
        {
            // Get location mapping from step details
            // The data is stored directly in StepDetails, not nested under a key
            var locationMapping = new Dictionary<string, int>();
            
            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_location_ids") && 
                _migrationState.StepDetails.ContainsKey("pterodactyl_location_ids"))
            {
                var importedIdsObj = _migrationState.StepDetails["imported_location_ids"];
                var pteroIdsObj = _migrationState.StepDetails["pterodactyl_location_ids"];
                
                List<int>? importedList = null;
                List<int>? pteroList = null;
                
                // Handle JsonElement (when loaded from JSON file)
                if (importedIdsObj is JsonElement importedElement)
                {
                    importedList = JsonSerializer.Deserialize<List<int>>(importedElement.GetRawText());
                }
                // Handle List<int> (when already deserialized)
                else if (importedIdsObj is List<int> importedIntList)
                {
                    importedList = importedIntList;
                }
                // Handle List<object> (when deserialized as objects)
                else if (importedIdsObj is List<object> importedObjList)
                {
                    importedList = importedObjList.Select(o => Convert.ToInt32(o)).ToList();
                }
                // Handle JsonElement array
                else if (importedIdsObj is JsonElement importedJsonArray && importedJsonArray.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    importedList = new List<int>();
                    foreach (var item in importedJsonArray.EnumerateArray())
                    {
                        if (item.ValueKind == System.Text.Json.JsonValueKind.Number)
                        {
                            importedList.Add(item.GetInt32());
                        }
                    }
                }
                
                if (pteroIdsObj is JsonElement pteroElement)
                {
                    pteroList = JsonSerializer.Deserialize<List<int>>(pteroElement.GetRawText());
                }
                else if (pteroIdsObj is List<int> pteroIntList)
                {
                    pteroList = pteroIntList;
                }
                else if (pteroIdsObj is List<object> pteroObjList)
                {
                    pteroList = pteroObjList.Select(o => Convert.ToInt32(o)).ToList();
                }
                else if (pteroIdsObj is JsonElement pteroJsonArray && pteroJsonArray.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    pteroList = new List<int>();
                    foreach (var item in pteroJsonArray.EnumerateArray())
                    {
                        if (item.ValueKind == System.Text.Json.JsonValueKind.Number)
                        {
                            pteroList.Add(item.GetInt32());
                        }
                    }
                }
                
                if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                {
                    for (int i = 0; i < pteroList.Count; i++)
                    {
                        locationMapping[pteroList[i].ToString()] = importedList[i];
                    }
                }
            }

            if (locationMapping.Count == 0)
            {
                throw new Exception("Location to location mapping not found. Please re-run the location import step.");
            }
            
            AnsiConsole.MarkupLine($"[green]✓ Found {locationMapping.Count} location to location mapping(s)[/]");

            AnsiConsole.MarkupLine("[yellow]Reading nodes from Pterodactyl database...[/]");
            
            var nodes = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Reading nodes...", async ctx =>
                {
                    return await dbService.GetNodesAsync(_pterodactylConfig);
                });

            if (nodes.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No nodes found in Pterodactyl database[/]");
                return new Dictionary<string, object>
                {
                    ["nodes_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0,
                    ["imported_node_ids"] = new List<int>(),
                    ["pterodactyl_node_ids"] = new List<int>()
                };
            }

            // Display nodes preview
            var nodesDisplay = new NodesDisplay();
            nodesDisplay.DisplayNodes(nodes);

            AnsiConsole.MarkupLine($"[yellow]Found {nodes.Count} node(s) that will be imported to FeatherPanel[/]");
            AnsiConsole.WriteLine();

            // Countdown with cancellation option
            AnsiConsole.MarkupLine("[bold yellow]Going to import the nodes into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[yellow]You can cancel by pressing Ctrl+C[/]");
            AnsiConsole.WriteLine();

            // Simple countdown
            try
            {
                for (int i = 3; i > 0; i--)
                {
                    AnsiConsole.MarkupLine($"[bold yellow]{i}...[/]");
                    await Task.Delay(1000);
                }
            }
            catch (OperationCanceledException)
            {
                AnsiConsole.MarkupLine("[yellow]Import cancelled by user[/]");
                throw new Exception("Import cancelled by user");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Importing nodes to FeatherPanel...[/]");

            // Initialize decryptor
            if (string.IsNullOrEmpty(_pterodactylConfig.AppKey))
            {
                throw new Exception("APP_KEY not found in Pterodactyl configuration. Cannot decrypt daemon tokens.");
            }

            var decryptor = new LaravelDecryptor(_pterodactylConfig.AppKey, logger);

            var importedCount = 0;
            var failedCount = 0;
            var importedNodeIds = new List<int>();

            foreach (var node in nodes)
            {
                try
                {
                    // Check if we have a mapping for this location
                    if (!locationMapping.ContainsKey(node.LocationId.ToString()))
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Skipping node '{EscapeMarkup(node.Name)}' (ID: {node.Id}) - No location mapping for location ID {node.LocationId}[/]");
                        failedCount++;
                        continue;
                    }

                    var mappedLocationId = locationMapping[node.LocationId.ToString()];

                    // Decrypt daemon token
                    string? decryptedToken = null;
                    if (!string.IsNullOrEmpty(node.DaemonToken))
                    {
                        decryptedToken = decryptor.Decrypt(node.DaemonToken);
                        if (string.IsNullOrEmpty(decryptedToken))
                        {
                            logger?.LogWarning("Failed to decrypt daemon token for node '{NodeName}' (ID: {NodeId}). Will use original encrypted token.", node.Name, node.Id);
                            // If decryption fails, use the original encrypted token
                            decryptedToken = node.DaemonToken;
                        }
                    }

                    var nodeData = new Models.NodeData
                    {
                        Id = node.Id,
                        Uuid = node.Uuid,
                        Public = node.Public,
                        Name = node.Name,
                        Description = node.Description,
                        LocationId = mappedLocationId,
                        Fqdn = node.Fqdn,
                        Scheme = node.Scheme,
                        BehindProxy = node.BehindProxy,
                        MaintenanceMode = node.MaintenanceMode,
                        Memory = node.Memory,
                        MemoryOverallocate = node.MemoryOverallocate,
                        Disk = node.Disk,
                        DiskOverallocate = node.DiskOverallocate,
                        UploadSize = node.UploadSize,
                        DaemonListen = node.DaemonListen,
                        DaemonSFTP = node.DaemonSFTP,
                        DaemonBase = node.DaemonBase,
                        DaemonTokenId = decryptedToken != null ? node.DaemonTokenId : null,
                        DaemonToken = decryptedToken
                    };

                    var importRequest = new Models.NodeImportRequest
                    {
                        Node = nodeData,
                        LocationToLocationMapping = locationMapping.ToDictionary(
                            kvp => kvp.Key,
                            kvp => kvp.Value
                        ),
                        GenerateNewTokens = false // Always use the original tokens (decrypted or encrypted)
                    };

                    var response = await apiClient.ImportNodeAsync(importRequest);

                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import node '{EscapeMarkup(node.Name)}' (ID: {node.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        var nodeId = response.Data?.Node?.Id ?? 0;
                        if (nodeId > 0)
                        {
                            // Verify the ID matches what we requested (should be the same as Pterodactyl node ID)
                            if (nodeId == node.Id)
                            {
                                AnsiConsole.MarkupLine($"[green]✓ Imported node '{EscapeMarkup(node.Name)}' (ID: {node.Id} - preserved)[/]");
                            }
                            else
                            {
                                AnsiConsole.MarkupLine($"[yellow]⚠  Imported node '{EscapeMarkup(node.Name)}' (Pterodactyl ID: {node.Id} → Node ID: {nodeId}) - ID changed[/]");
                            }
                            importedCount++;
                            importedNodeIds.Add(nodeId);
                        }
                        else
                        {
                            AnsiConsole.MarkupLine($"[yellow]⚠  Imported node '{EscapeMarkup(node.Name)}' (ID: {node.Id}) but node ID was not returned[/]");
                            importedCount++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing node '{EscapeMarkup(node.Name)}' (ID: {node.Id}): {EscapeMarkup(ex.Message)}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} node(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} node(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["nodes_count"] = nodes.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["imported_node_ids"] = importedNodeIds,
                ["pterodactyl_node_ids"] = nodes.Select(n => n.Id).ToList()
            };
        });

        // Step 6: Import Database Hosts
        await ExecuteStep("Step 6: Importing Database Hosts", "import_database_hosts", async () =>
        {
            // Get node mapping from step details
            var nodeMapping = new Dictionary<string, int>();
            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_node_ids") && 
                _migrationState.StepDetails.ContainsKey("pterodactyl_node_ids"))
            {
                var importedIdsObj = _migrationState.StepDetails["imported_node_ids"];
                var pteroIdsObj = _migrationState.StepDetails["pterodactyl_node_ids"];
                
                List<int>? importedList = null;
                List<int>? pteroList = null;
                
                // Handle different serialization formats
                if (importedIdsObj is JsonElement importedElement)
                {
                    importedList = JsonSerializer.Deserialize<List<int>>(importedElement.GetRawText());
                }
                else if (importedIdsObj is List<int> importedIntList)
                {
                    importedList = importedIntList;
                }
                else if (importedIdsObj is List<object> importedObjList)
                {
                    importedList = importedObjList.Select(o => Convert.ToInt32(o)).ToList();
                }
                else if (importedIdsObj is JsonElement importedJsonArray && importedJsonArray.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    importedList = new List<int>();
                    foreach (var item in importedJsonArray.EnumerateArray())
                    {
                        if (item.ValueKind == System.Text.Json.JsonValueKind.Number)
                        {
                            importedList.Add(item.GetInt32());
                        }
                    }
                }
                
                if (pteroIdsObj is JsonElement pteroElement)
                {
                    pteroList = JsonSerializer.Deserialize<List<int>>(pteroElement.GetRawText());
                }
                else if (pteroIdsObj is List<int> pteroIntList)
                {
                    pteroList = pteroIntList;
                }
                else if (pteroIdsObj is List<object> pteroObjList)
                {
                    pteroList = pteroObjList.Select(o => Convert.ToInt32(o)).ToList();
                }
                else if (pteroIdsObj is JsonElement pteroJsonArray && pteroJsonArray.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    pteroList = new List<int>();
                    foreach (var item in pteroJsonArray.EnumerateArray())
                    {
                        if (item.ValueKind == System.Text.Json.JsonValueKind.Number)
                        {
                            pteroList.Add(item.GetInt32());
                        }
                    }
                }
                
                if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                {
                    for (int i = 0; i < pteroList.Count; i++)
                    {
                        nodeMapping[pteroList[i].ToString()] = importedList[i];
                    }
                }
            }

            if (nodeMapping.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]⚠  Warning: No node mapping found. Database hosts with node_id will be skipped.[/]");
            }
            else
            {
                AnsiConsole.MarkupLine($"[green]✓ Found {nodeMapping.Count} node to node mapping(s)[/]");
            }

            AnsiConsole.MarkupLine("[yellow]Reading database hosts from Pterodactyl database...[/]");
            
            var hosts = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Reading database hosts...", async ctx =>
                {
                    return await dbService.GetDatabaseHostsAsync(_pterodactylConfig);
                });

            if (hosts.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No database hosts found in Pterodactyl database[/]");
                return new Dictionary<string, object>
                {
                    ["database_hosts_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0,
                    ["imported_database_host_ids"] = new List<int>(),
                    ["pterodactyl_database_host_ids"] = new List<int>()
                };
            }

            // Display database hosts preview
            var hostsDisplay = new DatabaseHostsDisplay();
            hostsDisplay.DisplayDatabaseHosts(hosts);

            AnsiConsole.MarkupLine($"[yellow]Found {hosts.Count} database host(s) that will be imported to FeatherPanel[/]");
            AnsiConsole.WriteLine();

            // Countdown with cancellation option
            AnsiConsole.MarkupLine("[bold yellow]Going to import the database hosts into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[yellow]You can cancel by pressing Ctrl+C[/]");
            AnsiConsole.WriteLine();

            // Simple countdown
            try
            {
                for (int i = 3; i > 0; i--)
                {
                    AnsiConsole.MarkupLine($"[bold yellow]{i}...[/]");
                    await Task.Delay(1000);
                }
            }
            catch (OperationCanceledException)
            {
                AnsiConsole.MarkupLine("[yellow]Import cancelled by user[/]");
                throw new Exception("Import cancelled by user");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Importing database hosts to FeatherPanel...[/]");

            // Initialize decryptor
            if (string.IsNullOrEmpty(_pterodactylConfig.AppKey))
            {
                throw new Exception("APP_KEY not found in Pterodactyl configuration. Cannot decrypt database passwords.");
            }

            var decryptor = new LaravelDecryptor(_pterodactylConfig.AppKey, logger);

            var importedCount = 0;
            var failedCount = 0;
            var importedDatabaseHostIds = new List<int>();
            var successfullyImportedPterodactylDatabaseHostIds = new List<int>();
            var databaseHostToDatabaseHostMapping = new Dictionary<string, int>();

            foreach (var host in hosts)
            {
                try
                {
                    // Map node_id if present (optional - can be null)
                    int? mappedNodeId = null;
                    if (host.NodeId.HasValue)
                    {
                        if (nodeMapping.ContainsKey(host.NodeId.Value.ToString()))
                        {
                            mappedNodeId = nodeMapping[host.NodeId.Value.ToString()];
                        }
                        else
                        {
                            AnsiConsole.MarkupLine($"[yellow]⚠  Warning: No node mapping for node ID {host.NodeId.Value} for database host '{EscapeMarkup(host.Name)}' (ID: {host.Id}). Will create without node_id.[/]");
                            mappedNodeId = null; // Don't send node_id if mapping not found
                        }
                    }
                    // If no node_id, mappedNodeId stays null (which is fine - API accepts it)

                    // Decrypt password
                    string? decryptedPassword = null;
                    if (!string.IsNullOrEmpty(host.Password))
                    {
                        decryptedPassword = decryptor.Decrypt(host.Password);
                        if (string.IsNullOrEmpty(decryptedPassword))
                        {
                            logger?.LogWarning("Failed to decrypt password for database host '{HostName}' (ID: {HostId}). Will use original encrypted password.", host.Name, host.Id);
                            // If decryption fails, use the original encrypted password
                            decryptedPassword = host.Password;
                        }
                    }

                    // Determine database type (default to mysql)
                    string databaseType = "mysql"; // Pterodactyl doesn't store this, default to mysql

                    var createRequest = new Models.DatabaseHostCreateRequest
                    {
                        Id = host.Id, // Preserve Pterodactyl database host ID for WHMCS and other services
                        Name = host.Name,
                        NodeId = mappedNodeId, // Can be null - API will handle it
                        DatabaseType = databaseType,
                        DatabasePort = host.Port,
                        DatabaseUsername = host.Username,
                        DatabasePassword = decryptedPassword,
                        DatabaseHost = host.Host
                    };

                    var response = await apiClient.CreateDatabaseHostAsync(createRequest);

                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import database host '{EscapeMarkup(host.Name)}' (ID: {host.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        // Show full response for debugging
                        if (response != null)
                        {
                            try
                            {
                                var fullResponse = Newtonsoft.Json.JsonConvert.SerializeObject(response, Newtonsoft.Json.Formatting.Indented);
                                AnsiConsole.MarkupLine($"[dim]  Full API Response:[/]");
                                AnsiConsole.WriteLine(fullResponse);
                            }
                            catch
                            {
                                // Ignore serialization errors
                            }
                        }
                        failedCount++;
                    }
                    else
                    {
                        var databaseId = response.Data?.DatabaseId ?? 0;
                        if (databaseId > 0)
                        {
                            // Verify the ID matches what we requested (should be the same as Pterodactyl database host ID)
                            if (databaseId == host.Id)
                            {
                                AnsiConsole.MarkupLine($"[green]✓ Imported database host '{EscapeMarkup(host.Name)}' (ID: {host.Id} - preserved)[/]");
                            }
                            else
                            {
                                AnsiConsole.MarkupLine($"[yellow]⚠  Imported database host '{EscapeMarkup(host.Name)}' (Pterodactyl ID: {host.Id} → Database ID: {databaseId}) - ID changed[/]");
                            }
                            importedCount++;
                            importedDatabaseHostIds.Add(databaseId);
                            successfullyImportedPterodactylDatabaseHostIds.Add(host.Id);
                            // Build mapping correctly: map Pterodactyl host ID to imported database host ID
                            databaseHostToDatabaseHostMapping[host.Id.ToString()] = databaseId;
                        }
                        else
                        {
                            AnsiConsole.MarkupLine($"[yellow]⚠  Imported database host '{EscapeMarkup(host.Name)}' (ID: {host.Id}) but database ID was not returned[/]");
                            importedCount++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing database host '{EscapeMarkup(host.Name)}' (ID: {host.Id}): {EscapeMarkup(ex.Message)}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} database host(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} database host(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["database_hosts_count"] = hosts.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["imported_database_host_ids"] = importedDatabaseHostIds,
                ["pterodactyl_database_host_ids"] = hosts.Select(h => h.Id).ToList(),
                ["successfully_imported_pterodactyl_database_host_ids"] = successfullyImportedPterodactylDatabaseHostIds,
                ["database_host_to_database_host_mapping"] = databaseHostToDatabaseHostMapping
            };
        });

        // Step 7: Import Allocations
        await ExecuteStep("Step 7: Importing Allocations", "import_allocations", async () =>
        {
            // Get node mapping from step details
            var nodeMapping = new Dictionary<string, int>();
            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_node_ids") && 
                _migrationState.StepDetails.ContainsKey("pterodactyl_node_ids"))
            {
                var importedIdsObj = _migrationState.StepDetails["imported_node_ids"];
                var pteroIdsObj = _migrationState.StepDetails["pterodactyl_node_ids"];
                
                List<int>? importedList = null;
                List<int>? pteroList = null;
                
                // Handle different serialization formats
                if (importedIdsObj is JsonElement importedJson)
                {
                    importedList = JsonSerializer.Deserialize<List<int>>(importedJson.GetRawText());
                }
                else if (importedIdsObj is List<object> importedObjList)
                {
                    importedList = importedObjList.Select(x => Convert.ToInt32(x)).ToList();
                }
                else if (importedIdsObj is List<int> importedIntList)
                {
                    importedList = importedIntList;
                }
                
                if (pteroIdsObj is JsonElement pteroJson)
                {
                    pteroList = JsonSerializer.Deserialize<List<int>>(pteroJson.GetRawText());
                }
                else if (pteroIdsObj is List<object> pteroObjList)
                {
                    pteroList = pteroObjList.Select(x => Convert.ToInt32(x)).ToList();
                }
                else if (pteroIdsObj is List<int> pteroIntList)
                {
                    pteroList = pteroIntList;
                }
                
                if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                {
                    for (int i = 0; i < pteroList.Count; i++)
                    {
                        nodeMapping[pteroList[i].ToString()] = importedList[i];
                    }
                }
            }
            
            if (nodeMapping.Count == 0)
            {
                AnsiConsole.MarkupLine("[red]✗ Node mapping not found. Please import nodes first.[/]");
                return new Dictionary<string, object>
                {
                    ["allocations_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0
                };
            }
            
            AnsiConsole.MarkupLine($"[green]✓ Found {nodeMapping.Count} node to node mapping(s)[/]");
            
            var allocations = await dbService.GetAllocationsAsync(_pterodactylConfig!);
            
            if (allocations.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No allocations found in Pterodactyl database[/]");
                return new Dictionary<string, object>
                {
                    ["allocations_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0
                };
            }
            
            var allocationsDisplay = new AllocationsDisplay();
            allocationsDisplay.DisplayAllocations(allocations);
            
            AnsiConsole.MarkupLine($"[yellow]Found {allocations.Count} allocation(s) that will be imported to FeatherPanel[/]");
            AnsiConsole.WriteLine();
            
            // Countdown with cancellation option
            AnsiConsole.MarkupLine("[bold yellow]Going to import the allocations into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[yellow]You can cancel by pressing Ctrl+C[/]");
            AnsiConsole.WriteLine();
            
            // Simple countdown
            try
            {
                for (int i = 3; i > 0; i--)
                {
                    AnsiConsole.MarkupLine($"[bold yellow]{i}...[/]");
                    await Task.Delay(1000);
                }
            }
            catch (OperationCanceledException)
            {
                AnsiConsole.MarkupLine("[yellow]Import cancelled by user[/]");
                throw new Exception("Import cancelled by user");
            }
            
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Importing allocations to FeatherPanel...[/]");
            
            var importedCount = 0;
            var failedCount = 0;
            var importedAllocationIds = new List<int>();
            
            foreach (var allocation in allocations)
            {
                try
                {
                    // Map node_id
                    if (!nodeMapping.ContainsKey(allocation.NodeId.ToString()))
                    {
                        AnsiConsole.MarkupLine($"[yellow]⚠  Skipping allocation {allocation.Ip}:{allocation.Port} (ID: {allocation.Id}) - node_id {allocation.NodeId} not found in mapping[/]");
                        failedCount++;
                        continue;
                    }
                    
                    var mappedNodeId = nodeMapping[allocation.NodeId.ToString()];
                    
                    var allocationData = new Models.AllocationData
                    {
                        Id = allocation.Id, // Preserve Pterodactyl allocation ID
                        NodeId = mappedNodeId,
                        Ip = allocation.Ip,
                        IpAlias = allocation.IpAlias,
                        Port = allocation.Port,
                        ServerId = allocation.ServerId, // Will be set to null if unknown/non-existent
                        Notes = allocation.Notes
                    };
                    
                    var importRequest = new Models.AllocationImportRequest
                    {
                        Allocation = allocationData,
                        NodeToNodeMapping = nodeMapping.ToDictionary(
                            kvp => kvp.Key,
                            kvp => kvp.Value
                        ),
                        ServerToServerMapping = null // Servers may not exist yet, so we don't map them
                    };
                    
                    var response = await apiClient.ImportAllocationAsync(importRequest);
                    
                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import allocation {allocation.Ip}:{allocation.Port} (ID: {allocation.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        if (response?.Data?.Allocation == null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Full API response: {JsonSerializer.Serialize(response)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        AnsiConsole.MarkupLine($"[green]✓ Imported allocation {allocation.Ip}:{allocation.Port} (ID: {allocation.Id})[/]");
                        importedCount++;
                        if (response.Data?.Allocation?.Id != null)
                        {
                            importedAllocationIds.Add(response.Data.Allocation.Id.Value);
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing allocation {EscapeMarkup(allocation.Ip)}:{allocation.Port} (ID: {allocation.Id}): {EscapeMarkup(ex.Message)}[/]");
                    failedCount++;
                }
            }
            
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} allocation(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} allocation(s)[/]");
            }
            
            return new Dictionary<string, object>
            {
                ["allocations_count"] = allocations.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["imported_allocation_ids"] = importedAllocationIds,
                ["pterodactyl_allocation_ids"] = allocations.Select(a => a.Id).ToList()
            };
        });

        // Step 8: Import Users
        await ExecuteStep("Step 8: Importing Users", "import_users", async () =>
        {
            AnsiConsole.MarkupLine("[yellow]Reading users from Pterodactyl database...[/]");
            
            var users = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Reading users...", async ctx =>
                {
                    return await dbService.GetUsersAsync(_pterodactylConfig);
                });

            if (users.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No users found in Pterodactyl database[/]");
                return new Dictionary<string, object>
                {
                    ["users_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0,
                    ["skipped_count"] = 0,
                    ["imported_user_ids"] = new List<int>(),
                    ["pterodactyl_user_ids"] = new List<int>()
                };
            }

            // Display users preview
            var usersDisplay = new UsersDisplay();
            usersDisplay.DisplayUsers(users);

            AnsiConsole.MarkupLine($"[yellow]Found {users.Count} user(s) that will be imported to FeatherPanel[/]");
            AnsiConsole.MarkupLine("[dim]Note: User ID 1 is reserved and will be skipped[/]");
            AnsiConsole.WriteLine();

            // Countdown with cancellation option
            AnsiConsole.MarkupLine("[bold yellow]Going to import the users into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[yellow]You can cancel by pressing Ctrl+C[/]");
            AnsiConsole.WriteLine();

            // Simple countdown
            try
            {
                for (int i = 3; i > 0; i--)
                {
                    AnsiConsole.MarkupLine($"[bold yellow]{i}...[/]");
                    await Task.Delay(1000);
                }
            }
            catch (OperationCanceledException)
            {
                AnsiConsole.MarkupLine("[yellow]Import cancelled by user[/]");
                throw new Exception("Import cancelled by user");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Importing users to FeatherPanel...[/]");

            var importedCount = 0;
            var failedCount = 0;
            var skippedCount = 0;
            var importedUserIds = new List<int>();
            var pterodactylUserIds = new List<int>(); // Only include successfully imported users

            foreach (var user in users)
            {
                try
                {
                    // Skip user ID 1 (reserved for main user)
                    if (user.Id == 1)
                    {
                        AnsiConsole.MarkupLine($"[yellow]⚠  Skipping user '{EscapeMarkup(user.Username)}' (ID: {user.Id}) - ID 1 is reserved for the main user[/]");
                        skippedCount++;
                        continue;
                    }

                    var userData = new Models.UserData
                    {
                        Id = user.Id, // Preserve Pterodactyl user ID (except ID 1)
                        Uuid = user.Uuid,
                        Username = user.Username,
                        Email = user.Email,
                        NameFirst = user.NameFirst,
                        NameLast = user.NameLast,
                        Password = user.Password, // Bcrypt hashed password (compatible)
                        RememberToken = user.RememberToken,
                        ExternalId = user.ExternalId,
                        RootAdmin = user.RootAdmin,
                        Language = user.Language
                    };

                    var importRequest = new Models.UserImportRequest
                    {
                        User = userData
                    };

                    var response = await apiClient.ImportUserAsync(importRequest);

                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import user '{user.Username}' (ID: {user.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        if (response?.Data?.User == null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Full API response: {JsonSerializer.Serialize(response)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        AnsiConsole.MarkupLine($"[green]✓ Imported user '{EscapeMarkup(user.Username)}' (ID: {user.Id})[/]");
                        importedCount++;
                        if (response.Data?.User?.Id != null)
                        {
                            importedUserIds.Add(response.Data.User.Id.Value);
                            pterodactylUserIds.Add(user.Id); // Only add successfully imported users
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing user '{EscapeMarkup(user.Username)}' (ID: {user.Id}): {EscapeMarkup(ex.Message)}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} user(s)[/]");
            if (skippedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Skipped {skippedCount} user(s) (ID 1 is reserved)[/]");
            }
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} user(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["users_count"] = users.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["skipped_count"] = skippedCount,
                ["imported_user_ids"] = importedUserIds,
                ["pterodactyl_user_ids"] = pterodactylUserIds // Only successfully imported users
            };
        });

        // Step 9: Import SSH Keys
        await ExecuteStep("Step 9: Importing SSH Keys", "import_ssh_keys", async () =>
        {
            // Get user mapping from step details
            var userMapping = new Dictionary<string, int>();
            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_user_ids") && 
                _migrationState.StepDetails.ContainsKey("pterodactyl_user_ids"))
            {
                var importedIdsObj = _migrationState.StepDetails["imported_user_ids"];
                var pteroIdsObj = _migrationState.StepDetails["pterodactyl_user_ids"];
                
                List<int>? importedList = null;
                List<int>? pteroList = null;
                
                // Handle different serialization formats
                if (importedIdsObj is JsonElement importedJson)
                {
                    importedList = JsonSerializer.Deserialize<List<int>>(importedJson.GetRawText());
                }
                else if (importedIdsObj is List<object> importedObjList)
                {
                    importedList = importedObjList.Select(x => Convert.ToInt32(x)).ToList();
                }
                else if (importedIdsObj is List<int> importedIntList)
                {
                    importedList = importedIntList;
                }
                
                if (pteroIdsObj is JsonElement pteroJson)
                {
                    pteroList = JsonSerializer.Deserialize<List<int>>(pteroJson.GetRawText());
                }
                else if (pteroIdsObj is List<object> pteroObjList)
                {
                    pteroList = pteroObjList.Select(x => Convert.ToInt32(x)).ToList();
                }
                else if (pteroIdsObj is List<int> pteroIntList)
                {
                    pteroList = pteroIntList;
                }
                
                if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                {
                    for (int i = 0; i < pteroList.Count; i++)
                    {
                        userMapping[pteroList[i].ToString()] = importedList[i];
                    }
                }
            }
            
            if (userMapping.Count == 0)
            {
                AnsiConsole.MarkupLine("[red]✗ User mapping not found. Please import users first.[/]");
                return new Dictionary<string, object>
                {
                    ["ssh_keys_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0
                };
            }
            
            AnsiConsole.MarkupLine($"[green]✓ Found {userMapping.Count} user to user mapping(s)[/]");
            
            AnsiConsole.MarkupLine("[yellow]Reading SSH keys from Pterodactyl database...[/]");
            
            var sshKeys = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Reading SSH keys...", async ctx =>
                {
                    return await dbService.GetSshKeysAsync(_pterodactylConfig);
                });

            if (sshKeys.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No SSH keys found in Pterodactyl database[/]");
                return new Dictionary<string, object>
                {
                    ["ssh_keys_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0,
                    ["imported_ssh_key_ids"] = new List<int>(),
                    ["pterodactyl_ssh_key_ids"] = new List<int>()
                };
            }

            // Display SSH keys preview
            var sshKeysDisplay = new SshKeysDisplay();
            sshKeysDisplay.DisplaySshKeys(sshKeys);

            AnsiConsole.MarkupLine($"[yellow]Found {sshKeys.Count} SSH key(s) that will be imported to FeatherPanel[/]");
            AnsiConsole.WriteLine();

            // Countdown with cancellation option
            AnsiConsole.MarkupLine("[bold yellow]Going to import the SSH keys into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[yellow]You can cancel by pressing Ctrl+C[/]");
            AnsiConsole.WriteLine();

            // Simple countdown
            try
            {
                for (int i = 3; i > 0; i--)
                {
                    AnsiConsole.MarkupLine($"[bold yellow]{i}...[/]");
                    await Task.Delay(1000);
                }
            }
            catch (OperationCanceledException)
            {
                AnsiConsole.MarkupLine("[yellow]Import cancelled by user[/]");
                throw new Exception("Import cancelled by user");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Importing SSH keys to FeatherPanel...[/]");

            var importedCount = 0;
            var failedCount = 0;
            var importedSshKeyIds = new List<int>();

            foreach (var sshKey in sshKeys)
            {
                try
                {
                    // Map user_id using the mapping, or use original if not found (e.g., user ID 1)
                    int mappedUserId;
                    if (userMapping.ContainsKey(sshKey.UserId.ToString()))
                    {
                        mappedUserId = userMapping[sshKey.UserId.ToString()];
                    }
                    else
                    {
                        // Use original user_id if not in mapping (e.g., user ID 1 was skipped but SSH keys should still be imported)
                        mappedUserId = sshKey.UserId;
                    }
                    
                    var sshKeyData = new Models.SshKeyData
                    {
                        Id = sshKey.Id, // Preserve Pterodactyl SSH key ID
                        UserId = mappedUserId,
                        Name = sshKey.Name,
                        PublicKey = sshKey.PublicKey,
                        Fingerprint = sshKey.Fingerprint
                    };
                    
                    var importRequest = new Models.SshKeyImportRequest
                    {
                        SshKey = sshKeyData,
                        UserToUserMapping = userMapping.ToDictionary(
                            kvp => kvp.Key,
                            kvp => kvp.Value
                        )
                    };
                    
                    var response = await apiClient.ImportSshKeyAsync(importRequest);
                    
                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import SSH key '{sshKey.Name}' (ID: {sshKey.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        if (response?.Data?.SshKey == null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Full API response: {JsonSerializer.Serialize(response)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        AnsiConsole.MarkupLine($"[green]✓ Imported SSH key '{EscapeMarkup(sshKey.Name)}' (ID: {sshKey.Id})[/]");
                        importedCount++;
                        if (response.Data?.SshKey?.Id != null)
                        {
                            importedSshKeyIds.Add(response.Data.SshKey.Id.Value);
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing SSH key '{EscapeMarkup(sshKey.Name)}' (ID: {sshKey.Id}): {EscapeMarkup(ex.Message)}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} SSH key(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} SSH key(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["ssh_keys_count"] = sshKeys.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["imported_ssh_key_ids"] = importedSshKeyIds,
                ["pterodactyl_ssh_key_ids"] = sshKeys.Select(k => k.Id).ToList()
            };
        });

        // Step 10: Import Servers and Server Variables
        await ExecuteStep("Step 10: Importing Servers", "import_servers", async () =>
        {
            // Get all necessary mappings from step details
            var nestToRealmMapping = new Dictionary<string, int>();
            var eggToSpellMapping = new Dictionary<string, int>();
            var nodeToNodeMapping = new Dictionary<string, int>();
            var userToUserMapping = new Dictionary<string, int>();
            var allocationToAllocationMapping = new Dictionary<string, int>();
            var variableToVariableMapping = new Dictionary<string, int>(); // egg_variable_id -> spell_variable_id (1:1 since IDs are preserved)
            var serverToServerMapping = new Dictionary<string, int>(); // Will be built as we import servers

            // Load nest to realm mapping
            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("nest_to_realm_mapping"))
            {
                var mappingData = _migrationState.StepDetails["nest_to_realm_mapping"];
                
                // Handle different serialization formats
                if (mappingData is JsonElement mappingJson)
                {
                    var dict = JsonSerializer.Deserialize<Dictionary<string, int>>(mappingJson.GetRawText());
                    if (dict != null)
                    {
                        nestToRealmMapping = dict;
                    }
                }
                else if (mappingData is Dictionary<string, object> mappingDict)
                {
                    foreach (var kvp in mappingDict)
                    {
                        if (int.TryParse(kvp.Value?.ToString(), out int value))
                        {
                            nestToRealmMapping[kvp.Key] = value;
                        }
                    }
                }
                else if (mappingData is Dictionary<string, int> directDict)
                {
                    nestToRealmMapping = directDict;
                }
            }
            
            // Fallback: rebuild from imported_realm_ids and pterodactyl_nest_ids if mapping is empty
            if (nestToRealmMapping.Count == 0 && _migrationState != null)
            {
                if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_realm_ids") && 
                    _migrationState.StepDetails.ContainsKey("pterodactyl_nest_ids"))
                {
                    var importedIdsObj = _migrationState.StepDetails["imported_realm_ids"];
                    var pteroIdsObj = _migrationState.StepDetails["pterodactyl_nest_ids"];
                    
                    List<int>? importedList = null;
                    List<int>? pteroList = null;
                    
                    if (importedIdsObj is JsonElement importedJson)
                    {
                        importedList = JsonSerializer.Deserialize<List<int>>(importedJson.GetRawText());
                    }
                    else if (importedIdsObj is List<int> importedIntList)
                    {
                        importedList = importedIntList;
                    }
                    
                    if (pteroIdsObj is JsonElement pteroJson)
                    {
                        pteroList = JsonSerializer.Deserialize<List<int>>(pteroJson.GetRawText());
                    }
                    else if (pteroIdsObj is List<int> pteroIntList)
                    {
                        pteroList = pteroIntList;
                    }
                    
                    if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                    {
                        for (int i = 0; i < pteroList.Count; i++)
                        {
                            nestToRealmMapping[pteroList[i].ToString()] = importedList[i];
                        }
                    }
                }
            }

            // Load egg to spell mapping (eggs preserve IDs, so egg_id -> spell_id is 1:1)
            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_spell_ids") && 
                _migrationState.StepDetails.ContainsKey("pterodactyl_egg_ids"))
            {
                var importedIdsObj = _migrationState.StepDetails["imported_spell_ids"];
                var pteroIdsObj = _migrationState.StepDetails["pterodactyl_egg_ids"];
                
                List<int>? importedList = null;
                List<int>? pteroList = null;
                
                if (importedIdsObj is JsonElement importedJson)
                {
                    importedList = JsonSerializer.Deserialize<List<int>>(importedJson.GetRawText());
                }
                else if (importedIdsObj is List<int> importedIntList)
                {
                    importedList = importedIntList;
                }
                
                if (pteroIdsObj is JsonElement pteroJson)
                {
                    pteroList = JsonSerializer.Deserialize<List<int>>(pteroJson.GetRawText());
                }
                else if (pteroIdsObj is List<int> pteroIntList)
                {
                    pteroList = pteroIntList;
                }
                
                if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                {
                    for (int i = 0; i < pteroList.Count; i++)
                    {
                        eggToSpellMapping[pteroList[i].ToString()] = importedList[i];
                    }
                }
            }

            // Load node to node mapping
            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_node_ids") && 
                _migrationState.StepDetails.ContainsKey("pterodactyl_node_ids"))
            {
                var importedIdsObj = _migrationState.StepDetails["imported_node_ids"];
                var pteroIdsObj = _migrationState.StepDetails["pterodactyl_node_ids"];
                
                List<int>? importedList = null;
                List<int>? pteroList = null;
                
                if (importedIdsObj is JsonElement importedJson)
                {
                    importedList = JsonSerializer.Deserialize<List<int>>(importedJson.GetRawText());
                }
                else if (importedIdsObj is List<int> importedIntList)
                {
                    importedList = importedIntList;
                }
                
                if (pteroIdsObj is JsonElement pteroJson)
                {
                    pteroList = JsonSerializer.Deserialize<List<int>>(pteroJson.GetRawText());
                }
                else if (pteroIdsObj is List<int> pteroIntList)
                {
                    pteroList = pteroIntList;
                }
                
                if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                {
                    for (int i = 0; i < pteroList.Count; i++)
                    {
                        nodeToNodeMapping[pteroList[i].ToString()] = importedList[i];
                    }
                }
            }

            // Load user to user mapping
            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_user_ids") && 
                _migrationState.StepDetails.ContainsKey("pterodactyl_user_ids"))
            {
                var importedIdsObj = _migrationState.StepDetails["imported_user_ids"];
                var pteroIdsObj = _migrationState.StepDetails["pterodactyl_user_ids"];
                
                List<int>? importedList = null;
                List<int>? pteroList = null;
                
                if (importedIdsObj is JsonElement importedJson)
                {
                    importedList = JsonSerializer.Deserialize<List<int>>(importedJson.GetRawText());
                }
                else if (importedIdsObj is List<int> importedIntList)
                {
                    importedList = importedIntList;
                }
                
                if (pteroIdsObj is JsonElement pteroJson)
                {
                    pteroList = JsonSerializer.Deserialize<List<int>>(pteroJson.GetRawText());
                }
                else if (pteroIdsObj is List<int> pteroIntList)
                {
                    pteroList = pteroIntList;
                }
                
                if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                {
                    for (int i = 0; i < pteroList.Count; i++)
                    {
                        userToUserMapping[pteroList[i].ToString()] = importedList[i];
                    }
                }
            }

            // Load allocation to allocation mapping
            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_allocation_ids") && 
                _migrationState.StepDetails.ContainsKey("pterodactyl_allocation_ids"))
            {
                var importedIdsObj = _migrationState.StepDetails["imported_allocation_ids"];
                var pteroIdsObj = _migrationState.StepDetails["pterodactyl_allocation_ids"];
                
                List<int>? importedList = null;
                List<int>? pteroList = null;
                
                if (importedIdsObj is JsonElement importedJson)
                {
                    importedList = JsonSerializer.Deserialize<List<int>>(importedJson.GetRawText());
                }
                else if (importedIdsObj is List<int> importedIntList)
                {
                    importedList = importedIntList;
                }
                
                if (pteroIdsObj is JsonElement pteroJson)
                {
                    pteroList = JsonSerializer.Deserialize<List<int>>(pteroJson.GetRawText());
                }
                else if (pteroIdsObj is List<int> pteroIntList)
                {
                    pteroList = pteroIntList;
                }
                
                if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                {
                    for (int i = 0; i < pteroList.Count; i++)
                    {
                        allocationToAllocationMapping[pteroList[i].ToString()] = importedList[i];
                    }
                }
            }

            // Build variable to variable mapping (1:1 since IDs are preserved)
            // Read eggs and their variables to build the mapping
            var eggs = await dbService.GetEggsWithVariablesAsync(_pterodactylConfig);
            foreach (var egg in eggs)
            {
                foreach (var variable in egg.Variables)
                {
                    // Since IDs are preserved, egg_variable_id = spell_variable_id
                    variableToVariableMapping[variable.Id.ToString()] = variable.Id;
                }
            }

            AnsiConsole.MarkupLine($"[green]✓ Found {nestToRealmMapping.Count} nest to realm mapping(s)[/]");
            AnsiConsole.MarkupLine($"[green]✓ Found {eggToSpellMapping.Count} egg to spell mapping(s)[/]");
            AnsiConsole.MarkupLine($"[green]✓ Found {nodeToNodeMapping.Count} node to node mapping(s)[/]");
            AnsiConsole.MarkupLine($"[green]✓ Found {userToUserMapping.Count} user to user mapping(s)[/]");
            AnsiConsole.MarkupLine($"[green]✓ Found {allocationToAllocationMapping.Count} allocation to allocation mapping(s)[/]");
            AnsiConsole.MarkupLine($"[green]✓ Found {variableToVariableMapping.Count} variable to variable mapping(s)[/]");

            AnsiConsole.MarkupLine("[yellow]Reading servers from Pterodactyl database...[/]");
            
            var servers = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Reading servers...", async ctx =>
                {
                    return await dbService.GetServersAsync(_pterodactylConfig);
                });

            if (servers.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No servers found in Pterodactyl database[/]");
                return new Dictionary<string, object>
                {
                    ["servers_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0,
                    ["imported_server_ids"] = new List<int>(),
                    ["pterodactyl_server_ids"] = new List<int>()
                };
            }

            // Display servers preview
            var serversDisplay = new ServersDisplay();
            serversDisplay.DisplayServers(servers);

            AnsiConsole.MarkupLine($"[yellow]Found {servers.Count} server(s) that will be imported to FeatherPanel[/]");
            AnsiConsole.WriteLine();

            // Countdown with cancellation option
            AnsiConsole.MarkupLine("[bold yellow]Going to import the servers into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[yellow]You can cancel by pressing Ctrl+C[/]");
            AnsiConsole.WriteLine();

            // Simple countdown
            try
            {
                for (int i = 3; i > 0; i--)
                {
                    AnsiConsole.MarkupLine($"[bold yellow]{i}...[/]");
                    await Task.Delay(1000);
                }
            }
            catch (OperationCanceledException)
            {
                AnsiConsole.MarkupLine("[yellow]Import cancelled by user[/]");
                throw new Exception("Import cancelled by user");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Importing servers to FeatherPanel...[/]");

            var importedCount = 0;
            var failedCount = 0;
            var importedServerIds = new List<int>();
            var totalVariablesImported = 0;

            foreach (var server in servers)
            {
                try
                {
                    // Get server variables for this server
                    var serverVariables = await dbService.GetServerVariablesAsync(_pterodactylConfig, server.Id);

                    // Map all IDs
                    // Use original nest_id if not in mapping (shouldn't happen, but handle gracefully)
                    int mappedRealmId;
                    if (nestToRealmMapping.ContainsKey(server.NestId.ToString()))
                    {
                        mappedRealmId = nestToRealmMapping[server.NestId.ToString()];
                    }
                    else
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Skipping server '{EscapeMarkup(server.Name)}' (ID: {server.Id}) - No realm mapping for nest ID {server.NestId}[/]");
                        failedCount++;
                        continue;
                    }

                    if (!eggToSpellMapping.ContainsKey(server.EggId.ToString()))
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Skipping server '{EscapeMarkup(server.Name)}' (ID: {server.Id}) - No spell mapping for egg ID {server.EggId}[/]");
                        failedCount++;
                        continue;
                    }

                    // Map node_id (use original if not in mapping)
                    int mappedNodeId = nodeToNodeMapping.ContainsKey(server.NodeId.ToString()) 
                        ? nodeToNodeMapping[server.NodeId.ToString()] 
                        : server.NodeId;

                    // Map owner_id (use original if not in mapping, e.g., user ID 1)
                    int mappedOwnerId = userToUserMapping.ContainsKey(server.OwnerId.ToString()) 
                        ? userToUserMapping[server.OwnerId.ToString()] 
                        : server.OwnerId;

                    // Map allocation_id
                    if (!allocationToAllocationMapping.ContainsKey(server.AllocationId.ToString()))
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Skipping server '{EscapeMarkup(server.Name)}' (ID: {server.Id}) - No allocation mapping for allocation ID {server.AllocationId}[/]");
                        failedCount++;
                        continue;
                    }

                    var mappedAllocationId = allocationToAllocationMapping[server.AllocationId.ToString()];
                    var mappedSpellId = eggToSpellMapping[server.EggId.ToString()];

                    // Note: parent_id is not supported by FeatherPanel, so we set it to null
                    // This prevents SQL errors when importing servers

                    var serverData = new Models.ServerData
                    {
                        Id = server.Id, // Preserve Pterodactyl server ID
                        Uuid = server.Uuid,
                        UuidShort = server.UuidShort,
                        NodeId = mappedNodeId,
                        Name = server.Name,
                        Description = server.Description,
                        Status = server.Status,
                        SkipScripts = server.SkipScripts,
                        OwnerId = mappedOwnerId,
                        Memory = server.Memory,
                        Swap = server.Swap,
                        Disk = server.Disk,
                        Io = server.Io,
                        Cpu = server.Cpu,
                        Threads = server.Threads,
                        OomDisabled = server.OomDisabled,
                        AllocationId = mappedAllocationId,
                        NestId = mappedRealmId, // Use mapped realm ID
                        EggId = server.EggId, // Keep original for mapping reference
                        SpellId = mappedSpellId, // Use mapped spell ID
                        Startup = server.Startup,
                        Image = server.Image,
                        AllocationLimit = server.AllocationLimit,
                        DatabaseLimit = server.DatabaseLimit,
                        BackupLimit = server.BackupLimit,
                        ExternalId = server.ExternalId,
                        InstalledAt = server.InstalledAt?.ToString("yyyy-MM-ddTHH:mm:ss")
                    };

                    var serverVariableData = serverVariables.Select(sv => new Models.ServerVariableData
                    {
                        Id = sv.Id,
                        VariableId = sv.VariableId, // This is the egg_variable_id (will be mapped by API)
                        VariableValue = sv.VariableValue
                    }).ToList();

                    var importRequest = new Models.ServerImportRequest
                    {
                        Server = serverData,
                        ServerVariables = serverVariableData,
                        NestToRealmMapping = nestToRealmMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                        EggToSpellMapping = eggToSpellMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                        NodeToNodeMapping = nodeToNodeMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                        UserToUserMapping = userToUserMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                        AllocationToAllocationMapping = allocationToAllocationMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                        VariableToVariableMapping = variableToVariableMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                        ServerToServerMapping = serverToServerMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)
                    };

                    var response = await apiClient.ImportServerAsync(importRequest);

                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import server '{EscapeMarkup(server.Name)}' (ID: {server.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        if (response?.Data?.Server == null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Full API response: {JsonSerializer.Serialize(response)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        var serverId = response.Data?.Server?.Id ?? 0;
                        var varsImported = response.Data?.VariablesImported ?? 0;
                        
                        if (serverId > 0)
                        {
                            AnsiConsole.MarkupLine($"[green]✓ Imported server '{EscapeMarkup(server.Name)}' (ID: {server.Id}) with {varsImported} variable(s)[/]");
                            importedCount++;
                            totalVariablesImported += varsImported;
                            importedServerIds.Add(serverId);
                            // Add to server mapping for parent_id mapping
                            serverToServerMapping[server.Id.ToString()] = serverId;
                            // Also track which Pterodactyl server IDs were successfully imported
                            if (_migrationState?.StepDetails != null)
                            {
                                if (!_migrationState.StepDetails.ContainsKey("successfully_imported_pterodactyl_server_ids"))
                                {
                                    _migrationState.StepDetails["successfully_imported_pterodactyl_server_ids"] = new List<int>();
                                }
                                if (_migrationState.StepDetails["successfully_imported_pterodactyl_server_ids"] is List<int> successfulPterodactylIds)
                                {
                                    successfulPterodactylIds.Add(server.Id);
                                }
                                else if (_migrationState.StepDetails["successfully_imported_pterodactyl_server_ids"] is List<object> successfulPterodactylObjIds)
                                {
                                    successfulPterodactylObjIds.Add(server.Id);
                                }
                            }
                        }
                        else
                        {
                            AnsiConsole.MarkupLine($"[yellow]⚠  Imported server '{EscapeMarkup(server.Name)}' (ID: {server.Id}) but server ID was not returned[/]");
                            importedCount++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing server '{EscapeMarkup(server.Name)}' (ID: {server.Id}): {EscapeMarkup(ex.Message)}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} server(s) with {totalVariablesImported} total variable(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} server(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["servers_count"] = servers.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["total_variables_imported"] = totalVariablesImported,
                ["imported_server_ids"] = importedServerIds,
                ["pterodactyl_server_ids"] = servers.Select(s => s.Id).ToList(),
                ["server_to_server_mapping"] = serverToServerMapping
            };
        });

        // Step 11: Import Server Databases
        await ExecuteStep("Step 11: Import Server Databases", "server_databases", async () =>
        {
            var databases = await dbService.GetServerDatabasesAsync(_pterodactylConfig!);

            if (databases.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No server databases found in Pterodactyl database.[/]");
                return new Dictionary<string, object>
                {
                    ["databases_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0
                };
            }

            AnsiConsole.MarkupLine($"[cyan]Found {databases.Count} server database(s) in Pterodactyl database.[/]");
            AnsiConsole.WriteLine();
            Display.ServerDatabasesDisplay.DisplayServerDatabases(databases);
            AnsiConsole.WriteLine();

            // 3-second countdown with cancellation option
            AnsiConsole.MarkupLine("[yellow]Going to import server databases into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[dim]Press Ctrl+C to cancel[/]");
            
            for (int i = 3; i > 0; i--)
            {
                await Task.Delay(1000);
                AnsiConsole.MarkupLine($"[yellow]{i}...[/]");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[green]Starting server database import...[/]");
            AnsiConsole.WriteLine();

            // Load mappings from migration state
            var serverToServerMapping = new Dictionary<string, int>();
            var databaseHostToDatabaseHostMapping = new Dictionary<string, int>();

            if (_migrationState?.StepDetails != null)
            {
                // Load server mapping
                if (_migrationState.StepDetails.TryGetValue("server_to_server_mapping", out var serverMappingObj))
                {
                    // Try to deserialize as dictionary directly
                    if (serverMappingObj is JsonElement serverMappingJson)
                    {
                        var dict = JsonSerializer.Deserialize<Dictionary<string, int>>(serverMappingJson.GetRawText());
                        if (dict != null)
                        {
                            foreach (var kvp in dict)
                            {
                                serverToServerMapping[kvp.Key] = kvp.Value;
                            }
                        }
                    }
                    else if (serverMappingObj is Dictionary<string, object> serverMappingDict)
                    {
                        foreach (var kvp in serverMappingDict)
                        {
                            if (kvp.Value is JsonElement jsonElement)
                            {
                                serverToServerMapping[kvp.Key] = jsonElement.GetInt32();
                            }
                            else if (kvp.Value is int intValue)
                            {
                                serverToServerMapping[kvp.Key] = intValue;
                            }
                            else if (kvp.Value is long longValue)
                            {
                                serverToServerMapping[kvp.Key] = (int)longValue;
                            }
                        }
                    }
                    else if (serverMappingObj is Dictionary<string, int> directDict)
                    {
                        foreach (var kvp in directDict)
                        {
                            serverToServerMapping[kvp.Key] = kvp.Value;
                        }
                    }
                }
                else
                {
                    // Fallback: rebuild from imported_server_ids and successfully_imported_pterodactyl_server_ids (preferred)
                    // or from imported_server_ids and pterodactyl_server_ids (if all servers were imported)
                    List<int>? importedList = null;
                    List<int>? pteroList = null;

                    if (_migrationState.StepDetails.TryGetValue("imported_server_ids", out var importedIdsObj))
                    {
                        if (importedIdsObj is JsonElement importedJson)
                        {
                            importedList = JsonSerializer.Deserialize<List<int>>(importedJson.GetRawText());
                        }
                        else if (importedIdsObj is List<object> importedObjList)
                        {
                            importedList = importedObjList.Select(x => Convert.ToInt32(x)).ToList();
                        }
                    }

                    // Try to get successfully imported Pterodactyl server IDs first
                    if (_migrationState.StepDetails.TryGetValue("successfully_imported_pterodactyl_server_ids", out var successfulPteroIdsObj))
                    {
                        if (successfulPteroIdsObj is JsonElement successfulPteroJson)
                        {
                            pteroList = JsonSerializer.Deserialize<List<int>>(successfulPteroJson.GetRawText());
                        }
                        else if (successfulPteroIdsObj is List<object> successfulPteroObjList)
                        {
                            pteroList = successfulPteroObjList.Select(x => Convert.ToInt32(x)).ToList();
                        }
                        else if (successfulPteroIdsObj is List<int> successfulPteroIntList)
                        {
                            pteroList = successfulPteroIntList;
                        }
                    }
                    // Fallback to all Pterodactyl server IDs if the successful list doesn't exist
                    else if (_migrationState.StepDetails.TryGetValue("pterodactyl_server_ids", out var pteroIdsObj))
                    {
                        if (pteroIdsObj is JsonElement pteroJson)
                        {
                            pteroList = JsonSerializer.Deserialize<List<int>>(pteroJson.GetRawText());
                        }
                        else if (pteroIdsObj is List<object> pteroObjList)
                        {
                            pteroList = pteroObjList.Select(x => Convert.ToInt32(x)).ToList();
                        }
                    }

                    if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                    {
                        for (int i = 0; i < importedList.Count; i++)
                        {
                            serverToServerMapping[pteroList[i].ToString()] = importedList[i];
                        }
                    }
                }

                // Load database host mapping
                if (_migrationState.StepDetails.TryGetValue("database_host_to_database_host_mapping", out var hostMappingObj))
                {
                    // Try to deserialize as dictionary directly
                    if (hostMappingObj is JsonElement hostMappingJson)
                    {
                        var dict = JsonSerializer.Deserialize<Dictionary<string, int>>(hostMappingJson.GetRawText());
                        if (dict != null)
                        {
                            foreach (var kvp in dict)
                            {
                                databaseHostToDatabaseHostMapping[kvp.Key] = kvp.Value;
                            }
                        }
                    }
                    else if (hostMappingObj is Dictionary<string, object> hostMappingDict)
                    {
                        foreach (var kvp in hostMappingDict)
                        {
                            if (kvp.Value is JsonElement jsonElement)
                            {
                                databaseHostToDatabaseHostMapping[kvp.Key] = jsonElement.GetInt32();
                            }
                            else if (kvp.Value is int intValue)
                            {
                                databaseHostToDatabaseHostMapping[kvp.Key] = intValue;
                            }
                            else if (kvp.Value is long longValue)
                            {
                                databaseHostToDatabaseHostMapping[kvp.Key] = (int)longValue;
                            }
                        }
                    }
                    else if (hostMappingObj is Dictionary<string, int> directDict)
                    {
                        foreach (var kvp in directDict)
                        {
                            databaseHostToDatabaseHostMapping[kvp.Key] = kvp.Value;
                        }
                    }
                }
                else
                {
                    // Fallback: rebuild from imported_database_host_ids and successfully_imported_pterodactyl_database_host_ids (preferred)
                    // or from imported_database_host_ids and pterodactyl_database_host_ids (if all hosts were imported)
                    List<int>? importedList = null;
                    List<int>? pteroList = null;

                    if (_migrationState.StepDetails.TryGetValue("imported_database_host_ids", out var importedIdsObj))
                    {
                        if (importedIdsObj is JsonElement importedJson)
                        {
                            importedList = JsonSerializer.Deserialize<List<int>>(importedJson.GetRawText());
                        }
                        else if (importedIdsObj is List<object> importedObjList)
                        {
                            importedList = importedObjList.Select(x => Convert.ToInt32(x)).ToList();
                        }
                    }

                    // Try to get successfully imported Pterodactyl database host IDs first
                    if (_migrationState.StepDetails.TryGetValue("successfully_imported_pterodactyl_database_host_ids", out var successfulPteroIdsObj))
                    {
                        if (successfulPteroIdsObj is JsonElement successfulPteroJson)
                        {
                            pteroList = JsonSerializer.Deserialize<List<int>>(successfulPteroJson.GetRawText());
                        }
                        else if (successfulPteroIdsObj is List<object> successfulPteroObjList)
                        {
                            pteroList = successfulPteroObjList.Select(x => Convert.ToInt32(x)).ToList();
                        }
                        else if (successfulPteroIdsObj is List<int> successfulPteroIntList)
                        {
                            pteroList = successfulPteroIntList;
                        }
                    }
                    // Fallback to all Pterodactyl database host IDs if the successful list doesn't exist
                    else if (_migrationState.StepDetails.TryGetValue("pterodactyl_database_host_ids", out var pteroIdsObj))
                    {
                        if (pteroIdsObj is JsonElement pteroJson)
                        {
                            pteroList = JsonSerializer.Deserialize<List<int>>(pteroJson.GetRawText());
                        }
                        else if (pteroIdsObj is List<object> pteroObjList)
                        {
                            pteroList = pteroObjList.Select(x => Convert.ToInt32(x)).ToList();
                        }
                    }

                    if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                    {
                        for (int i = 0; i < importedList.Count; i++)
                        {
                            databaseHostToDatabaseHostMapping[pteroList[i].ToString()] = importedList[i];
                        }
                    }
                }
            }

            if (serverToServerMapping.Count == 0)
            {
                AnsiConsole.MarkupLine("[red]✗ Server mapping not found. Please import servers first.[/]");
                throw new Exception("Server mapping not found. Please import servers first.");
            }

            // Check if database hosts step was completed
            bool databaseHostsStepCompleted = _migrationState?.CompletedSteps.Contains("import_database_hosts") == true;
            
            if (databaseHostToDatabaseHostMapping.Count == 0)
            {
                if (databaseHostsStepCompleted)
                {
                    // Step was completed but mapping is empty - check if there are any databases that need hosts
                    bool hasDatabasesNeedingHosts = databases.Any(db => db.DatabaseHostId > 0);
                    
                    if (hasDatabasesNeedingHosts)
                    {
                        AnsiConsole.MarkupLine("[red]✗ Database host mapping not found, but databases require database hosts.[/]");
                        AnsiConsole.MarkupLine("[yellow]The 'import_database_hosts' step was completed, but no database host mappings were found.[/]");
                        AnsiConsole.MarkupLine("[yellow]This may indicate that no database hosts were successfully imported.[/]");
                        AnsiConsole.MarkupLine("[yellow]Please check the migration progress and ensure database hosts were imported successfully.[/]");
                        throw new Exception("Database host mapping not found. Database hosts step was completed but no mappings exist. Please check if database hosts were imported successfully.");
                    }
                    else
                    {
                        // No databases need hosts, so empty mapping is OK
                        AnsiConsole.MarkupLine("[yellow]⚠  No database host mapping found, but no databases require database hosts. Continuing...[/]");
                    }
                }
                else
                {
                    AnsiConsole.MarkupLine("[red]✗ Database host mapping not found. Please import database hosts first.[/]");
                    AnsiConsole.MarkupLine("[yellow]The 'import_database_hosts' step must be completed before importing server databases.[/]");
                    throw new Exception("Database host mapping not found. Please import database hosts first.");
                }
            }

            // Initialize decryptor for server database passwords
            if (string.IsNullOrEmpty(_pterodactylConfig!.AppKey))
            {
                throw new Exception("APP_KEY not found in Pterodactyl configuration. Cannot decrypt server database passwords.");
            }

            var decryptor = new Utils.LaravelDecryptor(_pterodactylConfig.AppKey, logger);

            var importedCount = 0;
            var failedCount = 0;
            var importedDatabaseIds = new List<int>();

            foreach (var database in databases)
            {
                try
                {
                    // Map server_id
                    if (!serverToServerMapping.ContainsKey(database.ServerId.ToString()))
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Skipping server database '{database.Database}' (ID: {database.Id}) - No server mapping for server ID {database.ServerId}[/]");
                        failedCount++;
                        continue;
                    }

                    // Map database_host_id
                    if (!databaseHostToDatabaseHostMapping.ContainsKey(database.DatabaseHostId.ToString()))
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Skipping server database '{database.Database}' (ID: {database.Id}) - No database host mapping for host ID {database.DatabaseHostId}[/]");
                        failedCount++;
                        continue;
                    }

                    var mappedServerId = serverToServerMapping[database.ServerId.ToString()];
                    var mappedDatabaseHostId = databaseHostToDatabaseHostMapping[database.DatabaseHostId.ToString()];

                    // Decrypt password
                    string? decryptedPassword = null;
                    if (!string.IsNullOrEmpty(database.Password))
                    {
                        decryptedPassword = decryptor.Decrypt(database.Password);
                        if (string.IsNullOrEmpty(decryptedPassword))
                        {
                            logger?.LogWarning("Failed to decrypt password for server database '{DatabaseName}' (ID: {DatabaseId}). Will use original encrypted password.", database.Database, database.Id);
                            // If decryption fails, use the original encrypted password
                            decryptedPassword = database.Password;
                        }
                    }

                    var databaseData = new Models.ServerDatabaseData
                    {
                        Id = database.Id, // Preserve Pterodactyl database ID
                        ServerId = mappedServerId,
                        DatabaseHostId = mappedDatabaseHostId,
                        Database = database.Database,
                        Username = database.Username,
                        Remote = database.Remote,
                        Password = decryptedPassword ?? database.Password, // Decrypted password (or encrypted if decryption failed)
                        MaxConnections = database.MaxConnections > 0 ? database.MaxConnections : null,
                        CreatedAt = database.CreatedAt?.ToString("yyyy-MM-ddTHH:mm:ss"),
                        UpdatedAt = database.UpdatedAt?.ToString("yyyy-MM-ddTHH:mm:ss")
                    };

                    var importRequest = new Models.ServerDatabaseImportRequest
                    {
                        Database = databaseData,
                        ServerToServerMapping = serverToServerMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                        DatabaseHostToDatabaseHostMapping = databaseHostToDatabaseHostMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)
                    };

                    var response = await apiClient.ImportServerDatabaseAsync(importRequest);

                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import server database '{EscapeMarkup(database.Database ?? "")}' (ID: {database.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        if (response?.Data?.Database == null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Full API response: {System.Text.Json.JsonSerializer.Serialize(response)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        var databaseId = response.Data?.Database?.Id ?? 0;
                        
                        if (databaseId > 0)
                        {
                            AnsiConsole.MarkupLine($"[green]✓ Imported server database '{database.Database}' (ID: {database.Id})[/]");
                            importedCount++;
                            importedDatabaseIds.Add(databaseId);
                        }
                        else
                        {
                            AnsiConsole.MarkupLine($"[yellow]⚠  Imported server database '{database.Database}' (ID: {database.Id}) but database ID was not returned[/]");
                            importedCount++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing server database '{EscapeMarkup(database.Database)}' (ID: {database.Id}): {EscapeMarkup(ex.Message)}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} server database(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} server database(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["databases_count"] = databases.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["imported_database_ids"] = importedDatabaseIds,
                ["pterodactyl_database_ids"] = databases.Select(d => d.Id).ToList()
            };
        });

        // Step 12: Import Backups
        await ExecuteStep("Step 12: Import Backups", "import_backups", async () =>
        {
            var backups = await dbService.GetBackupsAsync(_pterodactylConfig!);

            if (backups.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No backups found in Pterodactyl database.[/]");
                return new Dictionary<string, object>
                {
                    ["backups_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0
                };
            }

            AnsiConsole.MarkupLine($"[cyan]Found {backups.Count} backup(s) in Pterodactyl database.[/]");
            AnsiConsole.WriteLine();
            Display.BackupsDisplay.DisplayBackups(backups);
            AnsiConsole.WriteLine();

            // 3-second countdown with cancellation option
            AnsiConsole.MarkupLine("[yellow]Going to import backups into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[dim]Press Ctrl+C to cancel[/]");
            
            for (int i = 3; i > 0; i--)
            {
                await Task.Delay(1000);
                AnsiConsole.MarkupLine($"[yellow]{i}...[/]");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[green]Starting backup import...[/]");
            AnsiConsole.WriteLine();

            // Load server mapping from migration state
            var serverToServerMapping = new Dictionary<string, int>();

            if (_migrationState?.StepDetails != null)
            {
                // Load server mapping
                if (_migrationState.StepDetails.TryGetValue("server_to_server_mapping", out var serverMappingObj))
                {
                    // Try to deserialize as dictionary directly
                    if (serverMappingObj is JsonElement serverMappingJson)
                    {
                        var dict = JsonSerializer.Deserialize<Dictionary<string, int>>(serverMappingJson.GetRawText());
                        if (dict != null)
                        {
                            foreach (var kvp in dict)
                            {
                                serverToServerMapping[kvp.Key] = kvp.Value;
                            }
                        }
                    }
                    else if (serverMappingObj is Dictionary<string, object> serverMappingDict)
                    {
                        foreach (var kvp in serverMappingDict)
                        {
                            if (kvp.Value is JsonElement jsonElement)
                            {
                                serverToServerMapping[kvp.Key] = jsonElement.GetInt32();
                            }
                            else if (kvp.Value is int intValue)
                            {
                                serverToServerMapping[kvp.Key] = intValue;
                            }
                            else if (kvp.Value is long longValue)
                            {
                                serverToServerMapping[kvp.Key] = (int)longValue;
                            }
                        }
                    }
                    else if (serverMappingObj is Dictionary<string, int> directDict)
                    {
                        foreach (var kvp in directDict)
                        {
                            serverToServerMapping[kvp.Key] = kvp.Value;
                        }
                    }
                }
                
                // Fallback: rebuild from imported_server_ids and successfully_imported_pterodactyl_server_ids
                // This runs if mapping is empty or doesn't exist
                if (serverToServerMapping.Count == 0)
                {
                    List<int>? importedList = null;
                    List<int>? pteroList = null;

                    if (_migrationState.StepDetails.TryGetValue("imported_server_ids", out var importedIdsObj))
                    {
                        if (importedIdsObj is JsonElement importedJson)
                        {
                            importedList = JsonSerializer.Deserialize<List<int>>(importedJson.GetRawText());
                        }
                        else if (importedIdsObj is List<object> importedObjList)
                        {
                            importedList = importedObjList.Select(x => Convert.ToInt32(x)).ToList();
                        }
                        else if (importedIdsObj is List<int> importedIntList)
                        {
                            importedList = importedIntList;
                        }
                    }

                    if (_migrationState.StepDetails.TryGetValue("successfully_imported_pterodactyl_server_ids", out var successfulPteroIdsObj))
                    {
                        if (successfulPteroIdsObj is JsonElement successfulPteroJson)
                        {
                            pteroList = JsonSerializer.Deserialize<List<int>>(successfulPteroJson.GetRawText());
                        }
                        else if (successfulPteroIdsObj is List<object> successfulPteroObjList)
                        {
                            pteroList = successfulPteroObjList.Select(x => Convert.ToInt32(x)).ToList();
                        }
                        else if (successfulPteroIdsObj is List<int> successfulPteroIntList)
                        {
                            pteroList = successfulPteroIntList;
                        }
                    }
                    else if (_migrationState.StepDetails.TryGetValue("pterodactyl_server_ids", out var pteroIdsObj))
                    {
                        if (pteroIdsObj is JsonElement pteroJson)
                        {
                            pteroList = JsonSerializer.Deserialize<List<int>>(pteroJson.GetRawText());
                        }
                        else if (pteroIdsObj is List<object> pteroObjList)
                        {
                            pteroList = pteroObjList.Select(x => Convert.ToInt32(x)).ToList();
                        }
                        else if (pteroIdsObj is List<int> pteroIntList)
                        {
                            pteroList = pteroIntList;
                        }
                    }

                    if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                    {
                        AnsiConsole.MarkupLine("[yellow]⚠  Rebuilding server mapping from lists...[/]");
                        for (int i = 0; i < importedList.Count; i++)
                        {
                            serverToServerMapping[pteroList[i].ToString()] = importedList[i];
                        }
                    }
                }
            }

            if (serverToServerMapping.Count == 0)
            {
                AnsiConsole.MarkupLine("[red]✗ Server mapping not found. Please import servers first.[/]");
                throw new Exception("Server mapping not found. Please import servers first.");
            }

            var importedCount = 0;
            var failedCount = 0;
            var importedBackupIds = new List<long>();

            foreach (var backup in backups)
            {
                try
                {
                    // Map server_id
                    if (!serverToServerMapping.ContainsKey(backup.ServerId.ToString()))
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Skipping backup '{EscapeMarkup(backup.Name)}' (ID: {backup.Id}) - No server mapping for server ID {backup.ServerId}[/]");
                        failedCount++;
                        continue;
                    }

                    var mappedServerId = serverToServerMapping[backup.ServerId.ToString()];

                    var backupData = new Models.BackupData
                    {
                        Id = backup.Id, // Preserve Pterodactyl backup ID
                        ServerId = mappedServerId,
                        Uuid = backup.Uuid,
                        UploadId = backup.UploadId,
                        IsSuccessful = backup.IsSuccessful,
                        IsLocked = backup.IsLocked,
                        Name = backup.Name,
                        IgnoredFiles = backup.IgnoredFiles,
                        Disk = backup.Disk,
                        Checksum = backup.Checksum,
                        Bytes = backup.Bytes,
                        CompletedAt = backup.CompletedAt?.ToString("yyyy-MM-ddTHH:mm:ss"),
                        CreatedAt = backup.CreatedAt?.ToString("yyyy-MM-ddTHH:mm:ss"),
                        UpdatedAt = backup.UpdatedAt?.ToString("yyyy-MM-ddTHH:mm:ss")
                    };

                    var importRequest = new Models.BackupImportRequest
                    {
                        Backup = backupData,
                        ServerToServerMapping = serverToServerMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)
                    };

                    var response = await apiClient.ImportBackupAsync(importRequest);

                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import backup '{EscapeMarkup(backup.Name)}' (ID: {backup.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        if (response?.Data?.Backup == null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Full API response: {System.Text.Json.JsonSerializer.Serialize(response)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        var backupId = response.Data?.Backup?.Id ?? 0;
                        
                        if (backupId > 0)
                        {
                            AnsiConsole.MarkupLine($"[green]✓ Imported backup '{EscapeMarkup(backup.Name)}' (ID: {backup.Id})[/]");
                            importedCount++;
                            importedBackupIds.Add(backupId);
                        }
                        else
                        {
                            AnsiConsole.MarkupLine($"[yellow]⚠  Imported backup '{EscapeMarkup(backup.Name)}' (ID: {backup.Id}) but backup ID was not returned[/]");
                            importedCount++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing backup '{EscapeMarkup(backup.Name)}' (ID: {backup.Id}): {EscapeMarkup(ex.Message)}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} backup(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} backup(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["backups_count"] = backups.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["imported_backup_ids"] = importedBackupIds,
                ["pterodactyl_backup_ids"] = backups.Select(b => b.Id).ToList()
            };
        });

        // Step 13: Import Subusers
        await ExecuteStep("Step 13: Import Subusers", "import_subusers", async () =>
        {
            var subusers = await dbService.GetSubusersAsync(_pterodactylConfig!);

            if (subusers.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No subusers found in Pterodactyl database.[/]");
                return new Dictionary<string, object>
                {
                    ["subusers_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0
                };
            }

            AnsiConsole.MarkupLine($"[cyan]Found {subusers.Count} subuser(s) in Pterodactyl database.[/]");
            AnsiConsole.WriteLine();
            Display.SubusersDisplay.ShowSubusers(subusers);
            AnsiConsole.WriteLine();

            // 3-second countdown with cancellation option
            AnsiConsole.MarkupLine("[yellow]Going to import subusers into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[dim]Press Ctrl+C to cancel[/]");
            
            for (int i = 3; i > 0; i--)
            {
                await Task.Delay(1000);
                AnsiConsole.MarkupLine($"[yellow]{i}...[/]");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[green]Starting subuser import...[/]");
            AnsiConsole.WriteLine();

            // Load user and server mappings from migration state
            var userToUserMapping = new Dictionary<string, int>();
            var serverToServerMapping = new Dictionary<string, int>();

            // Load user mapping
            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("user_to_user_mapping"))
            {
                var mappingData = _migrationState.StepDetails["user_to_user_mapping"];
                if (mappingData is JsonElement jsonElement)
                {
                    foreach (var prop in jsonElement.EnumerateObject())
                    {
                        if (prop.Value.ValueKind == JsonValueKind.Number)
                        {
                            userToUserMapping[prop.Name] = prop.Value.GetInt32();
                        }
                    }
                }
                else if (mappingData is Dictionary<string, object> dict)
                {
                    foreach (var kvp in dict)
                    {
                        if (kvp.Value is int intValue)
                        {
                            userToUserMapping[kvp.Key] = intValue;
                        }
                        else if (kvp.Value is long longValue)
                        {
                            userToUserMapping[kvp.Key] = (int)longValue;
                        }
                        else if (kvp.Value is JsonElement innerJsonElement && innerJsonElement.ValueKind == JsonValueKind.Number)
                        {
                            userToUserMapping[kvp.Key] = innerJsonElement.GetInt32();
                        }
                    }
                }
                else if (mappingData is Dictionary<string, int> directDict)
                {
                    userToUserMapping = directDict;
                }
            }

            // Fallback: rebuild from lists if dictionary is empty
            if (userToUserMapping.Count == 0 && _migrationState != null)
            {
                if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_user_ids") && 
                    _migrationState.StepDetails.ContainsKey("pterodactyl_user_ids"))
                {
                    var importedIdsObj = _migrationState.StepDetails["imported_user_ids"];
                    var pteroIdsObj = _migrationState.StepDetails["pterodactyl_user_ids"];
                    
                    List<int>? importedList = null;
                    List<int>? pteroList = null;
                    
                    // Handle different serialization formats
                    if (importedIdsObj is JsonElement importedJson)
                    {
                        importedList = JsonSerializer.Deserialize<List<int>>(importedJson.GetRawText());
                    }
                    else if (importedIdsObj is List<object> importedObjList)
                    {
                        importedList = importedObjList.Select(x => Convert.ToInt32(x)).ToList();
                    }
                    else if (importedIdsObj is List<int> importedIntList)
                    {
                        importedList = importedIntList;
                    }
                    
                    if (pteroIdsObj is JsonElement pteroJson)
                    {
                        pteroList = JsonSerializer.Deserialize<List<int>>(pteroJson.GetRawText());
                    }
                    else if (pteroIdsObj is List<object> pteroObjList)
                    {
                        pteroList = pteroObjList.Select(x => Convert.ToInt32(x)).ToList();
                    }
                    else if (pteroIdsObj is List<int> pteroIntList)
                    {
                        pteroList = pteroIntList;
                    }
                    
                    if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                    {
                        for (int i = 0; i < pteroList.Count; i++)
                        {
                            userToUserMapping[pteroList[i].ToString()] = importedList[i];
                        }
                    }
                }
            }

            // Load server mapping
            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("server_to_server_mapping"))
            {
                var mappingData = _migrationState.StepDetails["server_to_server_mapping"];
                if (mappingData is JsonElement jsonElement)
                {
                    foreach (var prop in jsonElement.EnumerateObject())
                    {
                        if (prop.Value.ValueKind == JsonValueKind.Number)
                        {
                            serverToServerMapping[prop.Name] = prop.Value.GetInt32();
                        }
                    }
                }
                else if (mappingData is Dictionary<string, object> dict)
                {
                    foreach (var kvp in dict)
                    {
                        if (kvp.Value is int intValue)
                        {
                            serverToServerMapping[kvp.Key] = intValue;
                        }
                        else if (kvp.Value is long longValue)
                        {
                            serverToServerMapping[kvp.Key] = (int)longValue;
                        }
                        else if (kvp.Value is JsonElement innerJsonElement && innerJsonElement.ValueKind == JsonValueKind.Number)
                        {
                            serverToServerMapping[kvp.Key] = innerJsonElement.GetInt32();
                        }
                    }
                }
                else if (mappingData is Dictionary<string, int> directDict)
                {
                    serverToServerMapping = directDict;
                }
            }

            // Fallback: rebuild from lists if dictionary is empty
            if (serverToServerMapping.Count == 0 && _migrationState != null)
            {
                if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_server_ids") && 
                    _migrationState.StepDetails.ContainsKey("successfully_imported_pterodactyl_server_ids"))
                {
                    var importedIds = _migrationState.StepDetails["imported_server_ids"];
                    var pterodactylIds = _migrationState.StepDetails["successfully_imported_pterodactyl_server_ids"];
                    
                    if (importedIds is JsonElement importedJson && pterodactylIds is JsonElement pterodactylJson)
                    {
                        var importedList = importedJson.EnumerateArray().Select(e => e.GetInt32()).ToList();
                        var pterodactylList = pterodactylJson.EnumerateArray().Select(e => e.GetInt32()).ToList();
                        
                        if (importedList.Count == pterodactylList.Count)
                        {
                            for (int i = 0; i < importedList.Count; i++)
                            {
                                serverToServerMapping[pterodactylList[i].ToString()] = importedList[i];
                            }
                        }
                    }
                }
            }

            if (userToUserMapping.Count == 0)
            {
                AnsiConsole.MarkupLine("[red]✗ User mapping not found. Please import users first.[/]");
                throw new Exception("User mapping not found. Please import users first.");
            }

            if (serverToServerMapping.Count == 0)
            {
                AnsiConsole.MarkupLine("[red]✗ Server mapping not found. Please import servers first.[/]");
                throw new Exception("Server mapping not found. Please import servers first.");
            }

            var importedCount = 0;
            var failedCount = 0;
            var importedSubuserIds = new List<int>();

            foreach (var subuser in subusers)
            {
                try
                {
                    // Map user_id
                    if (!userToUserMapping.ContainsKey(subuser.UserId.ToString()))
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Skipping subuser (ID: {subuser.Id}) - No user mapping for user ID {subuser.UserId}[/]");
                        failedCount++;
                        continue;
                    }

                    // Map server_id
                    if (!serverToServerMapping.ContainsKey(subuser.ServerId.ToString()))
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Skipping subuser (ID: {subuser.Id}) - No server mapping for server ID {subuser.ServerId}[/]");
                        failedCount++;
                        continue;
                    }

                    var mappedUserId = userToUserMapping[subuser.UserId.ToString()];
                    var mappedServerId = serverToServerMapping[subuser.ServerId.ToString()];

                    var subuserData = new Models.SubuserData
                    {
                        Id = subuser.Id, // Preserve Pterodactyl subuser ID
                        UserId = mappedUserId,
                        ServerId = mappedServerId,
                        Permissions = subuser.Permissions,
                        CreatedAt = subuser.CreatedAt?.ToString("yyyy-MM-dd HH:mm:ss"),
                        UpdatedAt = subuser.UpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss")
                    };

                    var importRequest = new Models.SubuserImportRequest
                    {
                        Subuser = subuserData,
                        UserToUserMapping = userToUserMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                        ServerToServerMapping = serverToServerMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)
                    };

                    var response = await apiClient.ImportSubuserAsync(importRequest);

                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import subuser (ID: {subuser.Id}, User: {subuser.UserId}, Server: {subuser.ServerId})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        var subuserId = response.Data?.Subuser?.Id ?? 0;
                        
                        if (subuserId > 0)
                        {
                            AnsiConsole.MarkupLine($"[green]✓ Imported subuser (ID: {subuser.Id}, User: {subuser.UserId}, Server: {subuser.ServerId})[/]");
                            importedCount++;
                            importedSubuserIds.Add(subuserId);
                        }
                        else
                        {
                            AnsiConsole.MarkupLine($"[yellow]⚠  Imported subuser (ID: {subuser.Id}) but subuser ID was not returned[/]");
                            importedCount++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing subuser (ID: {subuser.Id}): {ex.Message}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} subuser(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} subuser(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["subusers_count"] = subusers.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["imported_subuser_ids"] = importedSubuserIds,
                ["pterodactyl_subuser_ids"] = subusers.Select(s => s.Id).ToList()
            };
        });

        // Step 14: Import Schedules
        await ExecuteStep("Step 14: Import Schedules", "import_schedules", async () =>
        {
            var schedules = await dbService.GetSchedulesAsync(_pterodactylConfig!);

            if (schedules.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No schedules found in Pterodactyl database.[/]");
                return new Dictionary<string, object>
                {
                    ["schedules_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0
                };
            }

            AnsiConsole.MarkupLine($"[cyan]Found {schedules.Count} schedule(s) in Pterodactyl database.[/]");
            AnsiConsole.WriteLine();
            Display.SchedulesDisplay.ShowSchedules(schedules);
            AnsiConsole.WriteLine();

            // 3-second countdown with cancellation option
            AnsiConsole.MarkupLine("[yellow]Going to import schedules into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[dim]Press Ctrl+C to cancel[/]");
            
            for (int i = 3; i > 0; i--)
            {
                await Task.Delay(1000);
                AnsiConsole.MarkupLine($"[yellow]{i}...[/]");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[green]Starting schedule import...[/]");
            AnsiConsole.WriteLine();

            // Load server mapping from migration state
            var serverToServerMapping = new Dictionary<string, int>();

            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("server_to_server_mapping"))
            {
                var mappingData = _migrationState.StepDetails["server_to_server_mapping"];
                if (mappingData is JsonElement jsonElement)
                {
                    foreach (var prop in jsonElement.EnumerateObject())
                    {
                        if (prop.Value.ValueKind == JsonValueKind.Number)
                        {
                            serverToServerMapping[prop.Name] = prop.Value.GetInt32();
                        }
                    }
                }
                else if (mappingData is Dictionary<string, object> dict)
                {
                    foreach (var kvp in dict)
                    {
                        if (kvp.Value is int intValue)
                        {
                            serverToServerMapping[kvp.Key] = intValue;
                        }
                        else if (kvp.Value is long longValue)
                        {
                            serverToServerMapping[kvp.Key] = (int)longValue;
                        }
                        else if (kvp.Value is JsonElement innerJsonElement && innerJsonElement.ValueKind == JsonValueKind.Number)
                        {
                            serverToServerMapping[kvp.Key] = innerJsonElement.GetInt32();
                        }
                    }
                }
                else if (mappingData is Dictionary<string, int> directDict)
                {
                    serverToServerMapping = directDict;
                }
            }

            // Fallback: rebuild from lists if dictionary is empty
            if (serverToServerMapping.Count == 0 && _migrationState != null)
            {
                if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_server_ids") && 
                    _migrationState.StepDetails.ContainsKey("successfully_imported_pterodactyl_server_ids"))
                {
                    var importedIds = _migrationState.StepDetails["imported_server_ids"];
                    var pterodactylIds = _migrationState.StepDetails["successfully_imported_pterodactyl_server_ids"];
                    
                    if (importedIds is JsonElement importedJson && pterodactylIds is JsonElement pterodactylJson)
                    {
                        var importedList = importedJson.EnumerateArray().Select(e => e.GetInt32()).ToList();
                        var pterodactylList = pterodactylJson.EnumerateArray().Select(e => e.GetInt32()).ToList();
                        
                        if (importedList.Count == pterodactylList.Count)
                        {
                            for (int i = 0; i < importedList.Count; i++)
                            {
                                serverToServerMapping[pterodactylList[i].ToString()] = importedList[i];
                            }
                        }
                    }
                }
            }

            if (serverToServerMapping.Count == 0)
            {
                AnsiConsole.MarkupLine("[red]✗ Server mapping not found. Please import servers first.[/]");
                throw new Exception("Server mapping not found. Please import servers first.");
            }

            var importedCount = 0;
            var failedCount = 0;
            var importedScheduleIds = new List<int>();
            var scheduleToScheduleMapping = new Dictionary<string, int>();

            foreach (var schedule in schedules)
            {
                try
                {
                    // Map server_id
                    if (!serverToServerMapping.ContainsKey(schedule.ServerId.ToString()))
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Skipping schedule '{schedule.Name}' (ID: {schedule.Id}) - No server mapping for server ID {schedule.ServerId}[/]");
                        failedCount++;
                        continue;
                    }

                    var mappedServerId = serverToServerMapping[schedule.ServerId.ToString()];

                    var scheduleData = new Models.ScheduleData
                    {
                        Id = schedule.Id, // Preserve Pterodactyl schedule ID
                        ServerId = mappedServerId,
                        Name = schedule.Name,
                        CronDayOfWeek = schedule.CronDayOfWeek,
                        CronMonth = schedule.CronMonth,
                        CronDayOfMonth = schedule.CronDayOfMonth,
                        CronHour = schedule.CronHour,
                        CronMinute = schedule.CronMinute,
                        IsActive = schedule.IsActive ? 1 : 0,
                        IsProcessing = schedule.IsProcessing ? 1 : 0,
                        OnlyWhenOnline = schedule.OnlyWhenOnline,
                        LastRunAt = schedule.LastRunAt?.ToString("yyyy-MM-dd HH:mm:ss"),
                        NextRunAt = schedule.NextRunAt?.ToString("yyyy-MM-dd HH:mm:ss"),
                        CreatedAt = schedule.CreatedAt?.ToString("yyyy-MM-dd HH:mm:ss"),
                        UpdatedAt = schedule.UpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss")
                    };

                    var importRequest = new Models.ScheduleImportRequest
                    {
                        Schedule = scheduleData,
                        ServerToServerMapping = serverToServerMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)
                    };

                    var response = await apiClient.ImportScheduleAsync(importRequest);

                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import schedule '{schedule.Name}' (ID: {schedule.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        var scheduleId = response.Data?.Schedule?.Id ?? 0;
                        
                        if (scheduleId > 0)
                        {
                            AnsiConsole.MarkupLine($"[green]✓ Imported schedule '{schedule.Name}' (ID: {schedule.Id})[/]");
                            importedCount++;
                            importedScheduleIds.Add(scheduleId);
                            scheduleToScheduleMapping[schedule.Id.ToString()] = scheduleId;
                        }
                        else
                        {
                            AnsiConsole.MarkupLine($"[yellow]⚠  Imported schedule '{schedule.Name}' (ID: {schedule.Id}) but schedule ID was not returned[/]");
                            importedCount++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing schedule '{schedule.Name}' (ID: {schedule.Id}): {ex.Message}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} schedule(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} schedule(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["schedules_count"] = schedules.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["imported_schedule_ids"] = importedScheduleIds,
                ["pterodactyl_schedule_ids"] = schedules.Select(s => s.Id).ToList(),
                ["schedule_to_schedule_mapping"] = scheduleToScheduleMapping
            };
        });

        // Step 15: Import Tasks
        await ExecuteStep("Step 15: Import Tasks", "import_tasks", async () =>
        {
            var tasks = await dbService.GetTasksAsync(_pterodactylConfig!);

            if (tasks.Count == 0)
            {
                AnsiConsole.MarkupLine("[yellow]No tasks found in Pterodactyl database.[/]");
                return new Dictionary<string, object>
                {
                    ["tasks_count"] = 0,
                    ["imported_count"] = 0,
                    ["failed_count"] = 0
                };
            }

            AnsiConsole.MarkupLine($"[cyan]Found {tasks.Count} task(s) in Pterodactyl database.[/]");
            AnsiConsole.WriteLine();
            Display.TasksDisplay.ShowTasks(tasks);
            AnsiConsole.WriteLine();

            // 3-second countdown with cancellation option
            AnsiConsole.MarkupLine("[yellow]Going to import tasks into FeatherPanel in 3 seconds...[/]");
            AnsiConsole.MarkupLine("[dim]Press Ctrl+C to cancel[/]");
            
            for (int i = 3; i > 0; i--)
            {
                await Task.Delay(1000);
                AnsiConsole.MarkupLine($"[yellow]{i}...[/]");
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[green]Starting task import...[/]");
            AnsiConsole.WriteLine();

            // Load schedule mapping from migration state
            var scheduleToScheduleMapping = new Dictionary<string, int>();

            if (_migrationState != null && _migrationState.StepDetails.ContainsKey("schedule_to_schedule_mapping"))
            {
                var mappingData = _migrationState.StepDetails["schedule_to_schedule_mapping"];
                if (mappingData is JsonElement jsonElement)
                {
                    foreach (var prop in jsonElement.EnumerateObject())
                    {
                        if (prop.Value.ValueKind == JsonValueKind.Number)
                        {
                            scheduleToScheduleMapping[prop.Name] = prop.Value.GetInt32();
                        }
                    }
                }
                else if (mappingData is Dictionary<string, object> dict)
                {
                    foreach (var kvp in dict)
                    {
                        if (kvp.Value is int intValue)
                        {
                            scheduleToScheduleMapping[kvp.Key] = intValue;
                        }
                        else if (kvp.Value is long longValue)
                        {
                            scheduleToScheduleMapping[kvp.Key] = (int)longValue;
                        }
                        else if (kvp.Value is JsonElement innerJsonElement && innerJsonElement.ValueKind == JsonValueKind.Number)
                        {
                            scheduleToScheduleMapping[kvp.Key] = innerJsonElement.GetInt32();
                        }
                    }
                }
                else if (mappingData is Dictionary<string, int> directDict)
                {
                    scheduleToScheduleMapping = directDict;
                }
            }

            // Fallback: rebuild from lists if dictionary is empty
            if (scheduleToScheduleMapping.Count == 0 && _migrationState != null)
            {
                if (_migrationState != null && _migrationState.StepDetails.ContainsKey("imported_schedule_ids") && 
                    _migrationState.StepDetails.ContainsKey("pterodactyl_schedule_ids"))
                {
                    var importedIds = _migrationState.StepDetails["imported_schedule_ids"];
                    var pterodactylIds = _migrationState.StepDetails["pterodactyl_schedule_ids"];
                    
                    List<int>? importedList = null;
                    List<int>? pteroList = null;
                    
                    if (importedIds is JsonElement importedJson)
                    {
                        importedList = JsonSerializer.Deserialize<List<int>>(importedJson.GetRawText());
                    }
                    else if (importedIds is List<object> importedObjList)
                    {
                        importedList = importedObjList.Select(x => Convert.ToInt32(x)).ToList();
                    }
                    else if (importedIds is List<int> importedIntList)
                    {
                        importedList = importedIntList;
                    }
                    
                    if (pterodactylIds is JsonElement pteroJson)
                    {
                        pteroList = JsonSerializer.Deserialize<List<int>>(pteroJson.GetRawText());
                    }
                    else if (pterodactylIds is List<object> pteroObjList)
                    {
                        pteroList = pteroObjList.Select(x => Convert.ToInt32(x)).ToList();
                    }
                    else if (pterodactylIds is List<int> pteroIntList)
                    {
                        pteroList = pteroIntList;
                    }
                    
                    if (importedList != null && pteroList != null && importedList.Count == pteroList.Count)
                    {
                        for (int i = 0; i < pteroList.Count; i++)
                        {
                            scheduleToScheduleMapping[pteroList[i].ToString()] = importedList[i];
                        }
                    }
                }
            }

            if (scheduleToScheduleMapping.Count == 0)
            {
                AnsiConsole.MarkupLine("[red]✗ Schedule mapping not found. Please import schedules first.[/]");
                throw new Exception("Schedule mapping not found. Please import schedules first.");
            }

            var importedCount = 0;
            var failedCount = 0;
            var importedTaskIds = new List<int>();

            foreach (var task in tasks)
            {
                try
                {
                    // Map schedule_id
                    if (!scheduleToScheduleMapping.ContainsKey(task.ScheduleId.ToString()))
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Skipping task '{task.Action}' (ID: {task.Id}) - No schedule mapping for schedule ID {task.ScheduleId}[/]");
                        failedCount++;
                        continue;
                    }

                    var mappedScheduleId = scheduleToScheduleMapping[task.ScheduleId.ToString()];

                    var taskData = new Models.TaskData
                    {
                        Id = task.Id, // Preserve Pterodactyl task ID
                        ScheduleId = mappedScheduleId,
                        SequenceId = task.SequenceId,
                        Action = task.Action,
                        Payload = task.Payload,
                        TimeOffset = task.TimeOffset,
                        IsQueued = task.IsQueued ? 1 : 0,
                        ContinueOnFailure = task.ContinueOnFailure,
                        CreatedAt = task.CreatedAt?.ToString("yyyy-MM-dd HH:mm:ss"),
                        UpdatedAt = task.UpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss")
                    };

                    var importRequest = new Models.TaskImportRequest
                    {
                        Task = taskData,
                        ScheduleToScheduleMapping = scheduleToScheduleMapping.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)
                    };

                    var response = await apiClient.ImportTaskAsync(importRequest);

                    if (response == null || response.Error || !response.Success)
                    {
                        AnsiConsole.MarkupLine($"[red]✗ Failed to import task '{task.Action}' (ID: {task.Id})[/]");
                        if (response?.ErrorMessage != null)
                        {
                            AnsiConsole.MarkupLine($"[dim]  Error: {EscapeMarkup(response.ErrorMessage)}[/]");
                        }
                        failedCount++;
                    }
                    else
                    {
                        var taskId = response.Data?.Task?.Id ?? 0;
                        
                        if (taskId > 0)
                        {
                            AnsiConsole.MarkupLine($"[green]✓ Imported task '{task.Action}' (ID: {task.Id})[/]");
                            importedCount++;
                            importedTaskIds.Add(taskId);
                        }
                        else
                        {
                            AnsiConsole.MarkupLine($"[yellow]⚠  Imported task '{task.Action}' (ID: {task.Id}) but task ID was not returned[/]");
                            importedCount++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]✗ Error importing task '{task.Action}' (ID: {task.Id}): {ex.Message}[/]");
                    failedCount++;
                }
            }

            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine($"[green]✓ Successfully imported {importedCount} task(s)[/]");
            if (failedCount > 0)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Failed to import {failedCount} task(s)[/]");
            }

            return new Dictionary<string, object>
            {
                ["tasks_count"] = tasks.Count,
                ["imported_count"] = importedCount,
                ["failed_count"] = failedCount,
                ["imported_task_ids"] = importedTaskIds,
                ["pterodactyl_task_ids"] = tasks.Select(t => t.Id).ToList()
            };
        });

        // Migration Complete - Show Summary
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold green]═══════════════════════════════════════════════════════════[/]");
        AnsiConsole.MarkupLine("[bold green]  ✓ Migration from Pterodactyl to FeatherPanel Complete![/]");
        AnsiConsole.MarkupLine("[bold green]═══════════════════════════════════════════════════════════[/]");
        AnsiConsole.WriteLine();

        // Query Pterodactyl database to show what was imported
        AnsiConsole.MarkupLine("[cyan]Generating migration summary from Pterodactyl database...[/]");
        AnsiConsole.WriteLine();

        try
        {
            var locations = await dbService.GetLocationsAsync(_pterodactylConfig!);
            var nests = await dbService.GetNestsAsync(_pterodactylConfig!);
            var eggs = await dbService.GetEggsWithVariablesAsync(_pterodactylConfig!);
            var nodes = await dbService.GetNodesAsync(_pterodactylConfig!);
            var databaseHosts = await dbService.GetDatabaseHostsAsync(_pterodactylConfig!);
            var allocations = await dbService.GetAllocationsAsync(_pterodactylConfig!);
            var users = await dbService.GetUsersAsync(_pterodactylConfig!);
            var sshKeys = await dbService.GetSshKeysAsync(_pterodactylConfig!);
            var servers = await dbService.GetServersAsync(_pterodactylConfig!);
            var serverDatabases = await dbService.GetServerDatabasesAsync(_pterodactylConfig!);
            var backups = await dbService.GetBackupsAsync(_pterodactylConfig!);
            var subusers = await dbService.GetSubusersAsync(_pterodactylConfig!);
            var schedules = await dbService.GetSchedulesAsync(_pterodactylConfig!);
            var tasks = await dbService.GetTasksAsync(_pterodactylConfig!);

            var summaryTable = new Table();
            summaryTable.AddColumn("[bold]Item[/]");
            summaryTable.AddColumn("[bold]Count[/]");
            summaryTable.AddColumn("[bold]Status[/]");

            summaryTable.AddRow("[cyan]Locations[/]", locations.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]Realms (Nests)[/]", nests.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]Spells (Eggs)[/]", eggs.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]Nodes[/]", nodes.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]Database Hosts[/]", databaseHosts.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]Allocations[/]", allocations.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]Users[/]", users.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]SSH Keys[/]", sshKeys.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]Servers[/]", servers.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]Server Databases[/]", serverDatabases.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]Backups[/]", backups.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]Subusers[/]", subusers.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]Schedules[/]", schedules.Count.ToString(), "[green]✓ Imported[/]");
            summaryTable.AddRow("[cyan]Tasks[/]", tasks.Count.ToString(), "[green]✓ Imported[/]");

            AnsiConsole.Write(summaryTable);
            AnsiConsole.WriteLine();
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[yellow]⚠  Could not generate summary from database: {ex.Message}[/]");
            AnsiConsole.WriteLine();
        }

        // Next Steps
        AnsiConsole.MarkupLine("[bold yellow]═══════════════════════════════════════════════════════════[/]");
        AnsiConsole.MarkupLine("[bold yellow]  📋 Next Steps[/]");
        AnsiConsole.MarkupLine("[bold yellow]═══════════════════════════════════════════════════════════[/]");
        AnsiConsole.WriteLine();

        AnsiConsole.MarkupLine("[bold cyan]1. Install FeatherWings on Your Servers[/]");
        AnsiConsole.MarkupLine("[white]   Run the FeatherWings installation script on each node/server:[/]");
        AnsiConsole.MarkupLine("[dim]   curl -fsSL https://get.featherpanel.com/beta.sh | bash[/]");
        AnsiConsole.WriteLine();

        AnsiConsole.MarkupLine("[bold cyan]2. Copy Configuration Files[/]");
        AnsiConsole.MarkupLine("[white]   Copy the config.yml from FeatherPanel to each node:[/]");
        AnsiConsole.MarkupLine("[dim]   - Download config.yml from FeatherPanel admin panel[/]");
        AnsiConsole.MarkupLine("[dim]   - Place it in the FeatherWings configuration directory[/]");
        AnsiConsole.WriteLine();

        AnsiConsole.MarkupLine("[bold cyan]3. Install Pterodactyl Panel API Plugin (Recommended)[/]");
        AnsiConsole.MarkupLine("[white]   Install the Pterodactyl Panel API plugin on FeatherPanel:[/]");
        AnsiConsole.MarkupLine("[dim]   - This provides Pterodactyl API compatibility[/]");
        AnsiConsole.MarkupLine("[dim]   - Allows existing integrations to continue working[/]");
        AnsiConsole.WriteLine();

        AnsiConsole.MarkupLine("[bold cyan]4. Disable Old Wings and Use FeatherWings[/]");
        AnsiConsole.MarkupLine("[white]   On each node, disable the old Wings service:[/]");
        AnsiConsole.MarkupLine("[dim]   sudo systemctl disable wings[/]");
        AnsiConsole.MarkupLine("[dim]   sudo systemctl stop wings[/]");
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[white]   Then start FeatherWings with the config from FeatherPanel:[/]");
        AnsiConsole.MarkupLine("[dim]   sudo systemctl enable featherwings[/]");
        AnsiConsole.MarkupLine("[dim]   sudo systemctl start featherwings[/]");
        AnsiConsole.WriteLine();

        AnsiConsole.MarkupLine("[bold yellow]═══════════════════════════════════════════════════════════[/]");
        AnsiConsole.MarkupLine("[bold green]  ✓ All data has been successfully migrated![/]");
        AnsiConsole.MarkupLine("[bold yellow]═══════════════════════════════════════════════════════════[/]");
        AnsiConsole.WriteLine();

        // Mark migration as completed
        if (_migrationState != null && _progressService != null)
        {
            _migrationState.Status = "completed";
            _migrationState.LastCompletedStep = "All steps completed";
            _progressService.SaveProgress(_migrationState);
        }
    }

    private void UpdateProgress(string currentStep, string? pterodactylPath = null, Dictionary<string, object>? stepDetails = null)
    {
        if (_migrationState == null || _progressService == null) return;

        _migrationState.CurrentStep = currentStep;
        if (pterodactylPath != null)
        {
            _migrationState.PterodactylPath = pterodactylPath;
        }
        if (stepDetails != null)
        {
            foreach (var detail in stepDetails)
            {
                _migrationState.StepDetails[detail.Key] = detail.Value;
            }
        }
        _progressService.SaveProgress(_migrationState);
    }

    private void CompleteStep(string stepName, Dictionary<string, object>? stepDetails = null)
    {
        if (_migrationState == null || _progressService == null) return;

        if (!_migrationState.CompletedSteps.Contains(stepName))
        {
            _migrationState.CompletedSteps.Add(stepName);
        }
        _migrationState.LastCompletedStep = stepName;
        if (stepDetails != null)
        {
            foreach (var detail in stepDetails)
            {
                _migrationState.StepDetails[detail.Key] = detail.Value;
            }
        }
        _progressService.SaveProgress(_migrationState);
    }

    private async Task ExecuteStep(string stepTitle, string stepName, Func<Task<Dictionary<string, object>?>> stepAction)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine($"[bold blue]{stepTitle}[/]");
        AnsiConsole.MarkupLine("=====================================");
        AnsiConsole.MarkupLine($"[dim]Current Progress: {_migrationState?.CompletedSteps.Count ?? 0} step(s) completed[/]");
        AnsiConsole.MarkupLine($"[dim]Progress saved to: {_progressService?.GetProgressFilePath()}[/]");
        AnsiConsole.WriteLine();

        // Check if this step is already completed (resume functionality)
        if (_migrationState?.CompletedSteps.Contains(stepName) == true)
        {
            AnsiConsole.MarkupLine($"[yellow]⚠  Step '{stepName}' is already completed. Skipping...[/]");
            AnsiConsole.MarkupLine($"[dim]To re-run this step, remove '{stepName}' from the completed steps in the progress file[/]");
            AnsiConsole.WriteLine();
            return;
        }

        try
        {
            UpdateProgress(stepTitle);
            
            var result = await stepAction();
            
            CompleteStep(stepName, result);
            
            AnsiConsole.MarkupLine($"[green]✓ {stepTitle} - Completed[/]");
            AnsiConsole.MarkupLine($"[dim]Progress saved. Last completed: {stepName}[/]");
        }
        catch (Exception ex)
        {
            if (_migrationState != null && _progressService != null)
            {
                _migrationState.Status = "failed";
                _migrationState.ErrorMessage = ex.Message;
                _migrationState.CurrentStep = $"{stepTitle} - Failed";
                _progressService.SaveProgress(_migrationState);
            }

            AnsiConsole.MarkupLine($"[red]✗ {EscapeMarkup(stepTitle)} - Failed: {EscapeMarkup(ex.Message)}[/]");
            AnsiConsole.MarkupLine("[yellow]Migration stopped. Progress has been saved.[/]");
            AnsiConsole.MarkupLine($"[yellow]You can check the progress file: {_progressService?.GetProgressFilePath()}[/]");
            AnsiConsole.MarkupLine("[yellow]You can resume the migration by running the command again - it will skip completed steps.[/]");
            throw;
        }
    }

    private async Task RunReadinessCheckAsync(
        ILogger<PterodactylDatabaseService>? dbLogger = null,
        ConfigManager? configManager = null,
        FeatherPanelApiClient? apiClient = null,
        string? pterodactylDir = null)
    {
        AnsiConsole.MarkupLine("[bold blue]═══════════════════════════════════════════════════════════[/]");
        AnsiConsole.MarkupLine("[bold blue]  Pterodactyl Migration Readiness Check[/]");
        AnsiConsole.MarkupLine("[bold blue]═══════════════════════════════════════════════════════════[/]");
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[dim]This command will check if your Pterodactyl installation is ready for migration.[/]");
        AnsiConsole.MarkupLine("[dim]No data will be migrated during this check.[/]");
        AnsiConsole.WriteLine();

        var allChecksPassed = true;

        // Get Pterodactyl installation path
        string pterodactylPath;
        if (!string.IsNullOrEmpty(pterodactylDir))
        {
            pterodactylPath = pterodactylDir;
        }
        else
        {
            pterodactylPath = AnsiConsole.Ask<string>("Enter the path to your Pterodactyl installation:");
            if (string.IsNullOrWhiteSpace(pterodactylPath))
            {
                AnsiConsole.MarkupLine("[red]✗ Pterodactyl installation path is required[/]");
                return;
            }
        }

        // Normalize the path
        pterodactylPath = Path.GetFullPath(pterodactylPath);

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine($"[yellow]Checking Pterodactyl installation at: {pterodactylPath}[/]");

        // Check if directory exists
        if (!Directory.Exists(pterodactylPath))
        {
            AnsiConsole.MarkupLine($"[red]✗ Directory does not exist: {pterodactylPath}[/]");
            allChecksPassed = false;
            PrintSummary(allChecksPassed);
            return;
        }

        // Validate Pterodactyl installation
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[yellow]1. Validating Pterodactyl installation...[/]");
        var validator = new PterodactylInstallationValidator();
        var validationResult = validator.ValidateInstallation(pterodactylPath);
        
        if (!validationResult.IsValid)
        {
            AnsiConsole.MarkupLine($"[red]✗ Invalid Pterodactyl installation: {EscapeMarkup(validationResult.ErrorMessage)}[/]");
            allChecksPassed = false;
            PrintSummary(allChecksPassed);
            return;
        }

        AnsiConsole.MarkupLine("[green]✓ Valid Pterodactyl installation detected[/]");

        // Check for .blueprint directory
        if (validator.CheckBlueprintDirectory(pterodactylPath))
        {
            AnsiConsole.MarkupLine("[yellow]⚠  Blueprint directory detected (.blueprint)[/]");
            AnsiConsole.MarkupLine("[dim]  Note: Blueprint installations may require special handling[/]");
        }

        // Read and parse .env file
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[yellow]2. Reading configuration from .env file...[/]");
        var envFilePath = Path.Combine(pterodactylPath, ".env");
        if (!File.Exists(envFilePath))
        {
            AnsiConsole.MarkupLine($"[red]✗ .env file not found at: {envFilePath}[/]");
            allChecksPassed = false;
            PrintSummary(allChecksPassed);
            return;
        }

        var configLoader = new ConfigurationLoader();
        PterodactylConfig? pterodactylConfig;
        
        try
        {
            pterodactylConfig = configLoader.LoadFromEnvFile(envFilePath);
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ Failed to load configuration: {EscapeMarkup(ex.Message)}[/]");
            allChecksPassed = false;
            PrintSummary(allChecksPassed);
            return;
        }

        AnsiConsole.MarkupLine("[green]✓ Configuration loaded successfully[/]");

        // Display configuration (masking sensitive data)
        var configDisplay = new ConfigurationDisplay();
        configDisplay.DisplayConfiguration(pterodactylConfig);

        // Test database connection
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[yellow]3. Testing database connection...[/]");
        var dbService = new PterodactylDatabaseService(dbLogger);
        
        try
        {
            var connectionTest = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Connecting to database...", async ctx =>
                {
                    return await dbService.TestConnectionAsync(pterodactylConfig);
                });

            if (connectionTest)
            {
                AnsiConsole.MarkupLine("[green]✓ Successfully connected to Pterodactyl database[/]");
            }
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ Failed to connect to database: {EscapeMarkup(ex.Message)}[/]");
            AnsiConsole.MarkupLine("[yellow]Please verify your database credentials in the .env file[/]");
            allChecksPassed = false;
            PrintSummary(allChecksPassed);
            return;
        }

        // Check for required tables
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[yellow]4. Checking for required database tables...[/]");
        
        try
        {
            var tableCheckResult = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Checking tables...", async ctx =>
                {
                    return await dbService.CheckRequiredTablesAsync(pterodactylConfig);
                });

            if (tableCheckResult.AllTablesExist)
            {
                AnsiConsole.MarkupLine($"[green]✓ All {tableCheckResult.ExistingTables.Count} required tables found[/]");
            }
            else
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Found {tableCheckResult.ExistingTables.Count} of {PterodactylDatabaseService.GetRequiredTables().Length} required tables[/]");
                AnsiConsole.MarkupLine($"[red]✗ Missing {tableCheckResult.MissingTables.Count} required table(s):[/]");
                
                foreach (var missingTable in tableCheckResult.MissingTables)
                {
                    AnsiConsole.MarkupLine($"[red]  - {missingTable}[/]");
                }
                
                allChecksPassed = false;
            }
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]✗ Failed to check required tables: {EscapeMarkup(ex.Message)}[/]");
            AnsiConsole.MarkupLine("[yellow]Please verify your database connection and permissions[/]");
            allChecksPassed = false;
        }

        // Read application settings
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[yellow]5. Reading application settings...[/]");
        
        try
        {
            var appName = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .SpinnerStyle(Style.Parse("yellow"))
                .StartAsync("Loading settings...", async ctx =>
                {
                    return await dbService.GetSettingValueAsync(pterodactylConfig, "settings::app:name");
                });

            if (!string.IsNullOrEmpty(appName))
            {
                AnsiConsole.MarkupLine($"[green]✓ Pterodactyl Panel Name: [bold]{appName}[/][/]");
            }
            else
            {
                AnsiConsole.MarkupLine("[yellow]⚠  App name not found in settings (settings::app:name)[/]");
            }
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[yellow]⚠  Could not read app name: {EscapeMarkup(ex.Message)}[/]");
            // Don't fail the check if we can't read the app name
        }

        // Check FeatherPanel API connection (optional but recommended)
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[yellow]6. Checking FeatherPanel API connection...[/]");
        
        if (configManager != null && apiClient != null)
        {
            try
            {
                var isConfigured = await configManager.IsConfiguredAsync();
                if (!isConfigured)
                {
                    AnsiConsole.MarkupLine("[yellow]⚠  FeatherPanel API not configured[/]");
                    AnsiConsole.MarkupLine("[dim]  Run 'feathercli config setup' to configure the API connection[/]");
                }
                else
                {
                    var connectionValid = await AnsiConsole.Status()
                        .Spinner(Spinner.Known.Dots)
                        .SpinnerStyle(Style.Parse("yellow"))
                        .StartAsync("Connecting to FeatherPanel...", async ctx =>
                        {
                            return await apiClient.ValidateConnectionAsync();
                        });

                    if (connectionValid)
                    {
                        var session = await apiClient.GetUserSessionAsync();
                        if (session?.UserInfo != null)
                        {
                            AnsiConsole.MarkupLine($"[green]✓ Connected to FeatherPanel as: [bold]{EscapeMarkup(session.UserInfo.Username)}[/][/]");
                        }
                        else
                        {
                            AnsiConsole.MarkupLine("[green]✓ Connected to FeatherPanel API[/]");
                        }
                    }
                    else
                    {
                        AnsiConsole.MarkupLine("[yellow]⚠  Failed to connect to FeatherPanel API[/]");
                        AnsiConsole.MarkupLine("[dim]  This is optional but recommended for migration[/]");
                        AnsiConsole.MarkupLine("[dim]  Run 'feathercli config test' to verify your API configuration[/]");
                    }
                }
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[yellow]⚠  Could not check FeatherPanel API: {EscapeMarkup(ex.Message)}[/]");
                AnsiConsole.MarkupLine("[dim]  This is optional but recommended for migration[/]");
            }
        }
        else
        {
            AnsiConsole.MarkupLine("[yellow]⚠  FeatherPanel API check skipped (services not available)[/]");
        }

        // Print summary
        PrintSummary(allChecksPassed);
    }

    private void PrintSummary(bool allChecksPassed)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold]═══════════════════════════════════════════════════════════[/]");
        
        if (allChecksPassed)
        {
            AnsiConsole.MarkupLine("[bold green]✓ All checks passed! Your Pterodactyl installation is ready for migration.[/]");
            AnsiConsole.MarkupLine("[dim]You can now run 'feathercli migrate' to start the migration process.[/]");
        }
        else
        {
            AnsiConsole.MarkupLine("[bold red]✗ Some checks failed. Please fix the issues above before migrating.[/]");
            AnsiConsole.MarkupLine("[dim]Once all issues are resolved, run this check again to verify.[/]");
        }
        
        AnsiConsole.MarkupLine("[bold]═══════════════════════════════════════════════════════════[/]");
        AnsiConsole.WriteLine();
    }

    /// <summary>
    /// Escapes square brackets in strings to prevent Spectre.Console from interpreting them as markup.
    /// Uses Spectre.Console's Markup.Escape for proper escaping.
    /// </summary>
    private static string EscapeMarkup(string? text)
    {
        if (string.IsNullOrEmpty(text))
            return string.Empty;
        
        // Use Spectre.Console's built-in escape method for proper markup escaping
        return Markup.Escape(text);
    }
}
