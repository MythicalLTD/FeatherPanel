using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using FeatherCli.Core.Models;
using Spectre.Console;
using ServerModel = FeatherCli.Core.Models.Server;

namespace FeatherCli.Commands.Server.Commands;

public class ServerInfoCommand : BaseServerCommand
{
    public Command CreateInfoCommand(IServiceProvider serviceProvider)
    {
        var infoCommand = new Command("info", "Get detailed information about a server");
        var infoUuidOption = new Option<string?>("--uuid", "Server UUID or short UUID (will prompt if not provided)");
        infoCommand.AddOption(infoUuidOption);
        
        infoCommand.SetHandler(async (string? uuid) =>
        {
            var apiClient = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var configManager = serviceProvider.GetRequiredService<ConfigManager>();

            if (!await ValidateConfigurationAsync(configManager, apiClient))
                return;

            // If no UUID provided, let user select interactively
            if (string.IsNullOrEmpty(uuid))
            {
                var selectedServer = await SelectServerInteractivelyAsync(apiClient, configManager);
                if (selectedServer == null)
                {
                    return;
                }
                uuid = selectedServer.UuidShort ?? selectedServer.Uuid ?? throw new InvalidOperationException("Server has no UUID");
            }

            try
            {
                // Get detailed server information using the new endpoint
                var detailedResponse = await apiClient.GetServerDetailsAsync(uuid);
                var server = detailedResponse.Data;
                
                if (server == null)
                {
                    AnsiConsole.MarkupLine("[red]✗ Failed to retrieve detailed server information.[/]");
                    return;
                }

                // Display comprehensive server information
                AnsiConsole.MarkupLine($"[bold blue]📊 Server Information: {server.Name}[/]");
                AnsiConsole.WriteLine();

                DisplayBasicInformation(server);
                DisplayResourceInformation(server);
                DisplayStartupInformation(server);
                DisplayNodeInformation(server);
                DisplayRealmInformation(server);
                DisplaySpellInformation(server);
                DisplayAllocationInformation(server);
                DisplaySftpInformation(server);
                DisplayVariablesInformation(server);
                DisplayActivityInformation(server);
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ Error retrieving server details: {ex.Message}[/]");
            }
        }, infoUuidOption);

        return infoCommand;
    }

    private void DisplayBasicInformation(DetailedServer server)
    {
        var basicTable = new Table();
        basicTable.AddColumn("Property");
        basicTable.AddColumn("Value");

        basicTable.AddRow("Name", server.Name ?? "Unknown");
        basicTable.AddRow("UUID", server.Uuid ?? "Unknown");
        basicTable.AddRow("Short UUID", server.UuidShort ?? "Unknown");
        basicTable.AddRow("Description", server.Description ?? "No description");
        
        var statusColor = server.Status?.ToLower() switch
        {
            "running" => "green",
            "stopped" => "red",
            "starting" => "yellow",
            "stopping" => "orange",
            "offline" => "red",
            _ => "white"
        };
        basicTable.AddRow("Status", $"[{statusColor}]{server.Status ?? "Unknown"}[/]");
        
        basicTable.AddRow("Suspended", server.Suspended > 0 ? "[red]Yes[/]" : "[green]No[/]");
        basicTable.AddRow("Skip Scripts", server.SkipScripts > 0 ? "[yellow]Yes[/]" : "[green]No[/]");
        basicTable.AddRow("Owner ID", server.OwnerId.ToString());

        AnsiConsole.Write(basicTable);
    }

    private void DisplayResourceInformation(DetailedServer server)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold blue]💾 Resource Information[/]");
        var resourceTable = new Table();
        resourceTable.AddColumn("Resource");
        resourceTable.AddColumn("Value");

        resourceTable.AddRow("Memory", $"{server.Memory}MB");
        resourceTable.AddRow("Swap", $"{server.Swap}MB");
        resourceTable.AddRow("Disk", $"{server.Disk}MB");
        resourceTable.AddRow("CPU", $"{server.Cpu}%");
        resourceTable.AddRow("IO", $"{server.Io}MB/s");
        
        if (server.Threads.HasValue)
        {
            resourceTable.AddRow("Threads", server.Threads.Value.ToString());
        }

        resourceTable.AddRow("OOM Disabled", server.OomDisabled > 0 ? "[green]Yes[/]" : "[red]No[/]");
        resourceTable.AddRow("Allocation Limit", server.AllocationLimit.ToString());
        resourceTable.AddRow("Database Limit", server.DatabaseLimit.ToString());
        resourceTable.AddRow("Backup Limit", server.BackupLimit.ToString());

        AnsiConsole.Write(resourceTable);
    }

    private void DisplayStartupInformation(DetailedServer server)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold blue]🚀 Startup Information[/]");
        var startupTable = new Table();
        startupTable.AddColumn("Property");
        startupTable.AddColumn("Value");

        startupTable.AddRow("Startup Command", server.Startup ?? "Not configured");
        startupTable.AddRow("Docker Image", server.Image ?? "Not configured");
        startupTable.AddRow("Created At", server.CreatedAt ?? "Unknown");
        startupTable.AddRow("Updated At", server.UpdatedAt ?? "Unknown");
        startupTable.AddRow("Installed At", server.InstalledAt ?? "Unknown");
        
        if (!string.IsNullOrEmpty(server.LastError))
        {
            startupTable.AddRow("Last Error", $"[red]{server.LastError}[/]");
        }

        AnsiConsole.Write(startupTable);
    }

    private void DisplayNodeInformation(DetailedServer server)
    {
        if (server.Node != null)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[bold blue]🖥️ Node Information[/]");
            var nodeTable = new Table();
            nodeTable.AddColumn("Property");
            nodeTable.AddColumn("Value");

            nodeTable.AddRow("Name", server.Node.Name ?? "Unknown");
            nodeTable.AddRow("UUID", server.Node.Uuid ?? "Unknown");
            nodeTable.AddRow("Description", server.Node.Description ?? "No description");
            nodeTable.AddRow("FQDN", server.Node.Fqdn ?? "Unknown");
            nodeTable.AddRow("Scheme", server.Node.Scheme ?? "Unknown");
            nodeTable.AddRow("Public", server.Node.Public > 0 ? "[green]Yes[/]" : "[red]No[/]");
            nodeTable.AddRow("Location ID", server.Node.LocationId.ToString());
            nodeTable.AddRow("Maintenance Mode", server.Node.MaintenanceMode > 0 ? "[yellow]Yes[/]" : "[green]No[/]");
            nodeTable.AddRow("Behind Proxy", server.Node.BehindProxy > 0 ? "[yellow]Yes[/]" : "[green]No[/]");
            nodeTable.AddRow("Created At", server.Node.CreatedAt ?? "Unknown");
            nodeTable.AddRow("Updated At", server.Node.UpdatedAt ?? "Unknown");

            AnsiConsole.Write(nodeTable);
        }
    }

    private void DisplayRealmInformation(DetailedServer server)
    {
        if (server.Realm != null)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[bold blue]🎮 Realm Information[/]");
            var realmTable = new Table();
            realmTable.AddColumn("Property");
            realmTable.AddColumn("Value");

            realmTable.AddRow("ID", server.Realm.Id.ToString());
            realmTable.AddRow("Name", server.Realm.Name ?? "Unknown");
            realmTable.AddRow("Description", server.Realm.Description ?? "No description");
            realmTable.AddRow("Created At", server.Realm.CreatedAt ?? "Unknown");
            realmTable.AddRow("Updated At", server.Realm.UpdatedAt ?? "Unknown");

            AnsiConsole.Write(realmTable);
        }
    }

    private void DisplaySpellInformation(DetailedServer server)
    {
        if (server.Spell != null)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[bold blue]✨ Spell Information[/]");
            var spellTable = new Table();
            spellTable.AddColumn("Property");
            spellTable.AddColumn("Value");

            spellTable.AddRow("ID", server.Spell.Id.ToString());
            spellTable.AddRow("UUID", server.Spell.Uuid ?? "Unknown");
            spellTable.AddRow("Name", server.Spell.Name ?? "Unknown");
            spellTable.AddRow("Author", server.Spell.Author ?? "Unknown");
            spellTable.AddRow("Description", server.Spell.Description ?? "No description");
            spellTable.AddRow("Realm ID", server.Spell.RealmId.ToString());
            
            if (server.Spell.Features?.Any() == true)
            {
                spellTable.AddRow("Features", string.Join(", ", server.Spell.Features));
            }
            
            if (server.Spell.DockerImages?.Any() == true)
            {
                var dockerImages = string.Join("\n", server.Spell.DockerImages.Select(kv => $"{kv.Key}: {kv.Value}"));
                spellTable.AddRow("Docker Images", dockerImages);
            }
            
            spellTable.AddRow("Script Container", server.Spell.ScriptContainer ?? "Not configured");
            spellTable.AddRow("Script Entry", server.Spell.ScriptEntry ?? "Not configured");
            spellTable.AddRow("Script Privileged", server.Spell.ScriptIsPrivileged > 0 ? "[yellow]Yes[/]" : "[green]No[/]");
            spellTable.AddRow("Force Outgoing IP", server.Spell.ForceOutgoingIp > 0 ? "[yellow]Yes[/]" : "[green]No[/]");
            spellTable.AddRow("Created At", server.Spell.CreatedAt ?? "Unknown");
            spellTable.AddRow("Updated At", server.Spell.UpdatedAt ?? "Unknown");

            AnsiConsole.Write(spellTable);
        }
    }

    private void DisplayAllocationInformation(DetailedServer server)
    {
        if (server.Allocation != null)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[bold blue]🌐 Allocation Information[/]");
            var allocTable = new Table();
            allocTable.AddColumn("Property");
            allocTable.AddColumn("Value");

            allocTable.AddRow("ID", server.Allocation.Id.ToString());
            allocTable.AddRow("Node ID", server.Allocation.NodeId.ToString());
            allocTable.AddRow("IP Address", server.Allocation.Ip ?? "Unknown");
            allocTable.AddRow("Port", server.Allocation.Port.ToString());
            allocTable.AddRow("Server ID", server.Allocation.ServerId.ToString());
            
            if (!string.IsNullOrEmpty(server.Allocation.IpAlias))
            {
                allocTable.AddRow("IP Alias", server.Allocation.IpAlias);
            }
            
            if (!string.IsNullOrEmpty(server.Allocation.Notes))
            {
                allocTable.AddRow("Notes", server.Allocation.Notes);
            }
            
            allocTable.AddRow("Created At", server.Allocation.CreatedAt ?? "Unknown");
            allocTable.AddRow("Updated At", server.Allocation.UpdatedAt ?? "Unknown");

            AnsiConsole.Write(allocTable);
        }
    }

    private void DisplaySftpInformation(DetailedServer server)
    {
        if (server.Sftp != null)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[bold blue]📁 SFTP Information[/]");
            var sftpTable = new Table();
            sftpTable.AddColumn("Property");
            sftpTable.AddColumn("Value");

            sftpTable.AddRow("Host", server.Sftp.Host ?? "Unknown");
            sftpTable.AddRow("Port", server.Sftp.Port.ToString());
            sftpTable.AddRow("Username", server.Sftp.Username ?? "Unknown");
            sftpTable.AddRow("Password", "[red]***HIDDEN***[/]");
            sftpTable.AddRow("URL", server.Sftp.Url ?? "Unknown");

            AnsiConsole.Write(sftpTable);
        }
    }

    private void DisplayVariablesInformation(DetailedServer server)
    {
        if (server.Variables?.Any() == true)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[bold blue]⚙️ Server Variables[/]");
            var varTable = new Table();
            varTable.AddColumn("Name");
            varTable.AddColumn("Value");
            varTable.AddColumn("Environment Variable");
            varTable.AddColumn("Type");

            foreach (var variable in server.Variables)
            {
                varTable.AddRow(
                    variable.Name ?? "Unknown",
                    variable.VariableValue ?? "Not set",
                    variable.EnvVariable ?? "Unknown",
                    variable.FieldType ?? "Unknown"
                );
            }

            AnsiConsole.Write(varTable);
        }
    }

    private void DisplayActivityInformation(DetailedServer server)
    {
        if (server.Activity?.Any() == true)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[bold blue]📈 Recent Activity (Last 10 Events)[/]");
            var activityTable = new Table();
            activityTable.AddColumn("Timestamp");
            activityTable.AddColumn("Event");
            activityTable.AddColumn("IP");
            activityTable.AddColumn("Metadata");

            var recentActivity = server.Activity.Take(10);
            foreach (var activity in recentActivity)
            {
                var metadata = !string.IsNullOrEmpty(activity.Metadata) ? 
                    (activity.Metadata.Length > 50 ? activity.Metadata.Substring(0, 50) + "..." : activity.Metadata) : 
                    "None";
                
                activityTable.AddRow(
                    activity.Timestamp ?? "Unknown",
                    activity.Event ?? "Unknown",
                    activity.Ip ?? "N/A",
                    metadata
                );
            }

            AnsiConsole.Write(activityTable);
        }
    }
}

