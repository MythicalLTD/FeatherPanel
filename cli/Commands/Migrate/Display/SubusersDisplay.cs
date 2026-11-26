using Spectre.Console;
using FeatherCli.Commands.Migrate.Models;

namespace FeatherCli.Commands.Migrate.Display;

public static class SubusersDisplay
{
    public static void ShowSubusers(List<PterodactylSubuser> subusers)
    {
        if (subusers.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]No subusers found in Pterodactyl database.[/]");
            return;
        }

        var table = new Table();
        table.AddColumn("ID");
        table.AddColumn("User ID");
        table.AddColumn("Server ID");
        table.AddColumn("Permissions Count");
        table.AddColumn("Created At");

        var displayCount = Math.Min(25, subusers.Count);
        for (int i = 0; i < displayCount; i++)
        {
            var subuser = subusers[i];
            
            // Parse permissions to count them
            int permissionCount = 0;
            try
            {
                var permissions = System.Text.Json.JsonSerializer.Deserialize<List<object>>(subuser.Permissions);
                permissionCount = permissions?.Count ?? 0;
            }
            catch
            {
                permissionCount = 0;
            }

            table.AddRow(
                subuser.Id.ToString(),
                subuser.UserId.ToString(),
                subuser.ServerId.ToString(),
                permissionCount.ToString(),
                subuser.CreatedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "N/A"
            );
        }

        AnsiConsole.Write(table);

        if (subusers.Count > 25)
        {
            AnsiConsole.MarkupLine($"[dim]... and {subusers.Count - 25} more subusers[/]");
        }
    }
}

