using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using FeatherCli.Core.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Server.Commands;

public class ServerDatabaseCommands : BaseServerCommand
{
    public Command CreateCommand(IServiceProvider serviceProvider)
    {
        var root = new Command("databases", "Manage server databases");
        root.AddCommand(CreateListCommand(serviceProvider));
        root.AddCommand(CreateHostsCommand(serviceProvider));
        root.AddCommand(CreateCreateCommand(serviceProvider));
        root.AddCommand(CreateDeleteCommand(serviceProvider));
        return root;
    }

    private Command CreateListCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("list", "List databases");
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
                var result = await api.ListDatabasesAsync(uuid);
                var dbs = result.Data ?? new();
                if (dbs.Count == 0)
                {
                    AnsiConsole.MarkupLine("[yellow]No databases found.[/]");
                    return;
                }

                var table = new Table();
                table.AddColumn("ID");
                table.AddColumn("Name");
                table.AddColumn("Username");
                table.AddColumn("Host");
                table.AddColumn("Port");
                table.AddColumn("Type");

                foreach (var db in dbs)
                {
                    table.AddRow(
                        db.Id.ToString(),
                        Markup.Escape(db.Database ?? "-"),
                        Markup.Escape(db.Username ?? "-"),
                        Markup.Escape(db.DatabaseHost ?? db.DatabaseHostName ?? "-"),
                        db.DatabasePort?.ToString() ?? "-",
                        db.DatabaseType ?? "-");
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

    private Command CreateHostsCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("hosts", "List available database hosts");
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
                var hosts = await api.ListDatabaseHostsAsync(uuid);
                if (hosts.Count == 0)
                {
                    AnsiConsole.MarkupLine("[yellow]No database hosts available.[/]");
                    return;
                }

                var table = new Table();
                table.AddColumn("ID");
                table.AddColumn("Name");
                table.AddColumn("Host");
                table.AddColumn("Port");
                table.AddColumn("Type");

                foreach (var host in hosts)
                {
                    table.AddRow(
                        host.Id.ToString(),
                        Markup.Escape(host.Name ?? "-"),
                        Markup.Escape(host.DatabaseHost ?? "-"),
                        host.DatabasePort.ToString(),
                        host.DatabaseType ?? "-");
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
        var cmd = new Command("create", "Create a database");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var hostOption = new Option<int>("--host-id", "Database host ID") { IsRequired = true };
        var nameOption = new Option<string>("--name", "Database name") { IsRequired = true };
        var remoteOption = new Option<string?>("--remote", "Remote access pattern (default %)");
        cmd.AddOption(uuidOption);
        cmd.AddOption(hostOption);
        cmd.AddOption(nameOption);
        cmd.AddOption(remoteOption);

        cmd.SetHandler(async (string? uuid, int hostId, string name, string? remote) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            try
            {
                var created = await api.CreateDatabaseAsync(uuid, new DatabaseCreateRequest
                {
                    DatabaseHostId = hostId,
                    DatabaseName = name,
                    Remote = remote ?? "%"
                });

                AnsiConsole.MarkupLine($"[green]✓ Database created: {Markup.Escape(created.DatabaseName ?? name)}[/]");
                AnsiConsole.MarkupLine($"[dim]ID: {created.Id}[/]");
                AnsiConsole.MarkupLine($"[dim]Username: {Markup.Escape(created.Username ?? "-")}[/]");
                AnsiConsole.MarkupLine($"[dim]Password: {Markup.Escape(created.Password ?? "-")}[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, hostOption, nameOption, remoteOption);

        return cmd;
    }

    private Command CreateDeleteCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("delete", "Delete a database");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var idOption = new Option<int>("--id", "Database ID") { IsRequired = true };
        var forceOption = new Option<bool>("--force", () => false, "Skip confirmation");
        cmd.AddOption(uuidOption);
        cmd.AddOption(idOption);
        cmd.AddOption(forceOption);

        cmd.SetHandler(async (string? uuid, int id, bool force) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            if (!force && !AnsiConsole.Confirm($"Delete database #{id}?", false))
            {
                return;
            }

            try
            {
                await api.DeleteDatabaseAsync(uuid, id);
                AnsiConsole.MarkupLine("[green]✓ Database deleted[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, idOption, forceOption);

        return cmd;
    }
}
