using Spectre.Console;
using FeatherCli.Commands.Migrate.Models;

namespace FeatherCli.Commands.Migrate.Display;

public static class TasksDisplay
{
    public static void ShowTasks(List<PterodactylTask> tasks)
    {
        if (tasks.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]No tasks found in Pterodactyl database.[/]");
            return;
        }

        var table = new Table();
        table.AddColumn("ID");
        table.AddColumn("Schedule ID");
        table.AddColumn("Sequence");
        table.AddColumn("Action");
        table.AddColumn("Payload");
        table.AddColumn("Time Offset");

        var displayCount = Math.Min(25, tasks.Count);
        for (int i = 0; i < displayCount; i++)
        {
            var task = tasks[i];
            var payload = task.Payload.Length > 30 ? task.Payload.Substring(0, 27) + "..." : task.Payload;
            
            table.AddRow(
                task.Id.ToString(),
                task.ScheduleId.ToString(),
                task.SequenceId.ToString(),
                Markup.Escape(task.Action ?? ""),
                Markup.Escape(payload ?? ""),
                task.TimeOffset.ToString() + "s"
            );
        }

        AnsiConsole.Write(table);

        if (tasks.Count > 25)
        {
            AnsiConsole.MarkupLine($"[dim]... and {tasks.Count - 25} more task(s)[/]");
        }
    }
}

