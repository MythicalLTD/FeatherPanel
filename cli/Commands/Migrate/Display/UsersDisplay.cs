using FeatherCli.Commands.Migrate.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Display;

public class UsersDisplay
{
    public void DisplayUsers(List<PterodactylUser> users)
    {
        if (users.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]No users found[/]");
            return;
        }

        var table = new Table();
        table.AddColumn("[bold]ID[/]");
        table.AddColumn("[bold]Username[/]");
        table.AddColumn("[bold]Email[/]");
        table.AddColumn("[bold]Name[/]");
        table.AddColumn("[bold]Root Admin[/]");
        table.AddColumn("[bold]2FA[/]");

        var displayCount = Math.Min(users.Count, 25);
        for (int i = 0; i < displayCount; i++)
        {
            var user = users[i];
            var fullName = string.IsNullOrEmpty(user.NameFirst) && string.IsNullOrEmpty(user.NameLast)
                ? "N/A"
                : $"{user.NameFirst ?? ""} {user.NameLast ?? ""}".Trim();
            
            table.AddRow(
                user.Id.ToString(),
                Markup.Escape(user.Username ?? ""),
                Markup.Escape(user.Email ?? ""),
                Markup.Escape(fullName),
                user.RootAdmin ? "[green]Yes[/]" : "[dim]No[/]",
                user.UseTotp ? "[green]Yes[/]" : "[dim]No[/]"
            );
        }

        AnsiConsole.Write(table);

        if (users.Count > 25)
        {
            AnsiConsole.MarkupLine($"[dim]... and {users.Count - 25} more user(s)[/]");
        }
    }
}

