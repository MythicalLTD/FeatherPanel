using System.CommandLine;
using System.CommandLine.Invocation;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using FeatherCli.Core.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Server.Commands;

public class ServerScheduleCommands : BaseServerCommand
{
    public Command CreateCommand(IServiceProvider serviceProvider)
    {
        var root = new Command("schedules", "Manage server schedules");
        root.AddCommand(CreateListCommand(serviceProvider));
        root.AddCommand(CreateCreateCommand(serviceProvider));
        root.AddCommand(CreateDeleteCommand(serviceProvider));
        root.AddCommand(CreateRunCommand(serviceProvider));
        root.AddCommand(CreateToggleCommand(serviceProvider));
        return root;
    }

    private Command CreateListCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("list", "List schedules");
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
                var result = await api.ListSchedulesAsync(uuid);
                var schedules = result.Data ?? new();
                if (schedules.Count == 0)
                {
                    AnsiConsole.MarkupLine("[yellow]No schedules found.[/]");
                    return;
                }

                var table = new Table();
                table.AddColumn("ID");
                table.AddColumn("Name");
                table.AddColumn("Cron");
                table.AddColumn("Active");
                table.AddColumn("Next run");

                foreach (var s in schedules)
                {
                    var cron = $"{s.CronMinute} {s.CronHour} {s.CronDayOfMonth} {s.CronMonth} {s.CronDayOfWeek}";
                    table.AddRow(
                        s.Id.ToString(),
                        Markup.Escape(s.Name ?? "-"),
                        Markup.Escape(cron),
                        s.IsActive ? "[green]yes[/]" : "no",
                        s.NextRunAt ?? "-");
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
        var cmd = new Command("create", "Create a schedule");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var nameOption = new Option<string>("--name", "Schedule name") { IsRequired = true };
        var minuteOption = new Option<string>("--minute", () => "0", "Cron minute");
        var hourOption = new Option<string>("--hour", () => "*", "Cron hour");
        var dayOption = new Option<string>("--day-of-month", () => "*", "Cron day of month");
        var monthOption = new Option<string>("--month", () => "*", "Cron month");
        var dowOption = new Option<string>("--day-of-week", () => "*", "Cron day of week");
        var tzOption = new Option<string?>("--timezone", "IANA timezone");
        cmd.AddOption(uuidOption);
        cmd.AddOption(nameOption);
        cmd.AddOption(minuteOption);
        cmd.AddOption(hourOption);
        cmd.AddOption(dayOption);
        cmd.AddOption(monthOption);
        cmd.AddOption(dowOption);
        cmd.AddOption(tzOption);

        cmd.SetHandler(async (InvocationContext ctx) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            var uuid = await ResolveServerUuidAsync(api, config, ctx.ParseResult.GetValueForOption(uuidOption));
            if (uuid == null) return;

            try
            {
                var created = await api.CreateScheduleAsync(uuid, new ScheduleCreateRequest
                {
                    Name = ctx.ParseResult.GetValueForOption(nameOption)!,
                    CronMinute = ctx.ParseResult.GetValueForOption(minuteOption)!,
                    CronHour = ctx.ParseResult.GetValueForOption(hourOption)!,
                    CronDayOfMonth = ctx.ParseResult.GetValueForOption(dayOption)!,
                    CronMonth = ctx.ParseResult.GetValueForOption(monthOption)!,
                    CronDayOfWeek = ctx.ParseResult.GetValueForOption(dowOption)!,
                    Timezone = ctx.ParseResult.GetValueForOption(tzOption),
                    IsActive = true
                });

                AnsiConsole.MarkupLine($"[green]✓ Schedule created: {Markup.Escape(created.Name ?? "")} (#{created.Id})[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        });

        return cmd;
    }

    private Command CreateDeleteCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("delete", "Delete a schedule");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var idOption = new Option<int>("--id", "Schedule ID") { IsRequired = true };
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

            if (!force && !AnsiConsole.Confirm($"Delete schedule #{id}?", false))
            {
                return;
            }

            try
            {
                await api.DeleteScheduleAsync(uuid, id);
                AnsiConsole.MarkupLine("[green]✓ Schedule deleted[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, idOption, forceOption);

        return cmd;
    }

    private Command CreateRunCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("run", "Run a schedule now");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var idOption = new Option<int>("--id", "Schedule ID") { IsRequired = true };
        cmd.AddOption(uuidOption);
        cmd.AddOption(idOption);

        cmd.SetHandler(async (string? uuid, int id) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            try
            {
                await api.RunScheduleAsync(uuid, id);
                AnsiConsole.MarkupLine("[green]✓ Schedule triggered[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, idOption);

        return cmd;
    }

    private Command CreateToggleCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("toggle", "Enable/disable a schedule");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var idOption = new Option<int>("--id", "Schedule ID") { IsRequired = true };
        cmd.AddOption(uuidOption);
        cmd.AddOption(idOption);

        cmd.SetHandler(async (string? uuid, int id) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            try
            {
                var result = await api.ToggleScheduleAsync(uuid, id);
                AnsiConsole.MarkupLine($"[green]✓ Schedule is now {Markup.Escape(result.Status ?? (result.IsActive ? "enabled" : "disabled"))}[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, idOption);

        return cmd;
    }
}
