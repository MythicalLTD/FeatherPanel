using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using Spectre.Console;

namespace FeatherCli.Commands.Server.Commands;

public class ServerBackupCommands : BaseServerCommand
{
    public Command CreateCommand(IServiceProvider serviceProvider)
    {
        var root = new Command("backups", "Manage server backups");
        root.AddCommand(CreateListCommand(serviceProvider));
        root.AddCommand(CreateCreateCommand(serviceProvider));
        root.AddCommand(CreateDeleteCommand(serviceProvider));
        root.AddCommand(CreateRestoreCommand(serviceProvider));
        root.AddCommand(CreateDownloadCommand(serviceProvider));
        root.AddCommand(CreateLockCommand(serviceProvider));
        root.AddCommand(CreateUnlockCommand(serviceProvider));
        return root;
    }

    private Command CreateListCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("list", "List backups");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        cmd.AddOption(uuidOption);

        cmd.SetHandler(async (string? uuid) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            try
            {
                var result = await api.ListBackupsAsync(uuid);
                var backups = result.Data ?? new();
                if (backups.Count == 0)
                {
                    AnsiConsole.MarkupLine("[yellow]No backups found.[/]");
                    return;
                }

                var table = new Table();
                table.AddColumn("UUID");
                table.AddColumn("Name");
                table.AddColumn("Disk");
                table.AddColumn("OK");
                table.AddColumn("Locked");
                table.AddColumn("Created");

                foreach (var b in backups)
                {
                    table.AddRow(
                        b.Uuid ?? "-",
                        b.Name ?? "-",
                        b.Disk ?? "-",
                        b.IsSuccessful > 0 ? "[green]yes[/]" : "[red]no[/]",
                        b.IsLocked > 0 ? "yes" : "no",
                        b.CreatedAt ?? "-");
                }

                AnsiConsole.Write(table);
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption);

        return cmd;
    }

    private Command CreateCreateCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("create", "Create a backup");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var nameOption = new Option<string?>("--name", "Backup name");
        cmd.AddOption(uuidOption);
        cmd.AddOption(nameOption);

        cmd.SetHandler(async (string? uuid, string? name) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            try
            {
                var created = await api.CreateBackupAsync(uuid, name);
                AnsiConsole.MarkupLine($"[green]✓ Backup started: {Markup.Escape(created.Name ?? created.Uuid ?? "?")}[/]");
                if (!string.IsNullOrEmpty(created.Uuid))
                {
                    AnsiConsole.MarkupLine($"[dim]UUID: {created.Uuid}[/]");
                }
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, nameOption);

        return cmd;
    }

    private Command CreateDeleteCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("delete", "Delete a backup");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var backupOption = new Option<string>("--backup", "Backup UUID") { IsRequired = true };
        var forceOption = new Option<bool>("--force", () => false, "Skip confirmation");
        cmd.AddOption(uuidOption);
        cmd.AddOption(backupOption);
        cmd.AddOption(forceOption);

        cmd.SetHandler(async (string? uuid, string backup, bool force) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            if (!force && !AnsiConsole.Confirm($"Delete backup {backup}?", false))
            {
                return;
            }

            try
            {
                await api.DeleteBackupAsync(uuid, backup);
                AnsiConsole.MarkupLine("[green]✓ Backup deleted[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, backupOption, forceOption);

        return cmd;
    }

    private Command CreateRestoreCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("restore", "Restore a backup");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var backupOption = new Option<string>("--backup", "Backup UUID") { IsRequired = true };
        var truncateOption = new Option<bool>("--truncate", () => false, "Wipe files before restore");
        var forceOption = new Option<bool>("--force", () => false, "Skip confirmation");
        cmd.AddOption(uuidOption);
        cmd.AddOption(backupOption);
        cmd.AddOption(truncateOption);
        cmd.AddOption(forceOption);

        cmd.SetHandler(async (string? uuid, string backup, bool truncate, bool force) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            if (!force && !AnsiConsole.Confirm($"Restore backup {backup}?", false))
            {
                return;
            }

            try
            {
                await api.RestoreBackupAsync(uuid, backup, truncate);
                AnsiConsole.MarkupLine("[green]✓ Restore started[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, backupOption, truncateOption, forceOption);

        return cmd;
    }

    private Command CreateDownloadCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("download", "Get backup download URL");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var backupOption = new Option<string>("--backup", "Backup UUID") { IsRequired = true };
        cmd.AddOption(uuidOption);
        cmd.AddOption(backupOption);

        cmd.SetHandler(async (string? uuid, string backup) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            try
            {
                var result = await api.GetBackupDownloadUrlAsync(uuid, backup);
                AnsiConsole.MarkupLine($"[green]{Markup.Escape(result.DownloadUrl ?? "")}[/]");
                if (result.ExpiresIn > 0)
                {
                    AnsiConsole.MarkupLine($"[dim]Expires in {result.ExpiresIn}s[/]");
                }
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, backupOption);

        return cmd;
    }

    private Command CreateLockCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("lock", "Lock a backup");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var backupOption = new Option<string>("--backup", "Backup UUID") { IsRequired = true };
        cmd.AddOption(uuidOption);
        cmd.AddOption(backupOption);

        cmd.SetHandler(async (string? uuid, string backup) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            try
            {
                await api.LockBackupAsync(uuid, backup);
                AnsiConsole.MarkupLine("[green]✓ Backup locked[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, backupOption);

        return cmd;
    }

    private Command CreateUnlockCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("unlock", "Unlock a backup");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var backupOption = new Option<string>("--backup", "Backup UUID") { IsRequired = true };
        cmd.AddOption(uuidOption);
        cmd.AddOption(backupOption);

        cmd.SetHandler(async (string? uuid, string backup) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            try
            {
                await api.UnlockBackupAsync(uuid, backup);
                AnsiConsole.MarkupLine("[green]✓ Backup unlocked[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, backupOption);

        return cmd;
    }
}
