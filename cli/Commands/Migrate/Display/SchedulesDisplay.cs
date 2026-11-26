using Spectre.Console;
using FeatherCli.Commands.Migrate.Models;

namespace FeatherCli.Commands.Migrate.Display;

public static class SchedulesDisplay
{
    public static void ShowSchedules(List<PterodactylSchedule> schedules)
    {
        if (schedules.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]No schedules found in Pterodactyl database.[/]");
            return;
        }

        var table = new Table();
        table.AddColumn("ID");
        table.AddColumn("Server ID");
        table.AddColumn("Name");
        table.AddColumn("Cron Expression");
        table.AddColumn("Active");
        table.AddColumn("Created At");

        var displayCount = Math.Min(25, schedules.Count);
        for (int i = 0; i < displayCount; i++)
        {
            var schedule = schedules[i];
            var cronExpr = $"{schedule.CronMinute} {schedule.CronHour} {schedule.CronDayOfMonth} {schedule.CronMonth} {schedule.CronDayOfWeek}";
            
            var nameDisplay = schedule.Name.Length > 30 ? schedule.Name.Substring(0, 27) + "..." : schedule.Name;
            var cronDisplay = cronExpr.Length > 30 ? cronExpr.Substring(0, 27) + "..." : cronExpr;
            table.AddRow(
                schedule.Id.ToString(),
                schedule.ServerId.ToString(),
                Markup.Escape(nameDisplay ?? ""),
                Markup.Escape(cronDisplay),
                schedule.IsActive ? "✓" : "✗",
                schedule.CreatedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "N/A"
            );
        }

        AnsiConsole.Write(table);

        if (schedules.Count > 25)
        {
            AnsiConsole.MarkupLine($"[dim]... and {schedules.Count - 25} more schedule(s)[/]");
        }
    }
}

