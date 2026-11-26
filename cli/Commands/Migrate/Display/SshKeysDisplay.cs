using FeatherCli.Commands.Migrate.Models;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Display;

public class SshKeysDisplay
{
    public void DisplaySshKeys(List<PterodactylSshKey> sshKeys)
    {
        if (sshKeys.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]No SSH keys found[/]");
            return;
        }

        var table = new Table();
        table.AddColumn("[bold]ID[/]");
        table.AddColumn("[bold]User ID[/]");
        table.AddColumn("[bold]Name[/]");
        table.AddColumn("[bold]Fingerprint[/]");

        var displayCount = Math.Min(sshKeys.Count, 25);
        for (int i = 0; i < displayCount; i++)
        {
            var sshKey = sshKeys[i];
            table.AddRow(
                sshKey.Id.ToString(),
                sshKey.UserId.ToString(),
                Markup.Escape(sshKey.Name ?? ""),
                Markup.Escape(sshKey.Fingerprint ?? "")
            );
        }

        AnsiConsole.Write(table);

        if (sshKeys.Count > 25)
        {
            AnsiConsole.MarkupLine($"[dim]... and {sshKeys.Count - 25} more SSH key(s)[/]");
        }
    }
}

