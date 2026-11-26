using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Display;

public class BlueprintWarningDisplay
{
    public bool ShowWarningAndConfirm()
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold yellow]⚠  WARNING: Blueprint Detected[/]");
        AnsiConsole.MarkupLine("[yellow]=====================================[/]");
        AnsiConsole.MarkupLine("[yellow]A .blueprint directory was found in the Pterodactyl installation.[/]");
        AnsiConsole.MarkupLine("[yellow]Blueprint appears to be installed, which means the database structure[/]");
        AnsiConsole.MarkupLine("[yellow]might have been tampered with by installed plugins.[/]");
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[red]Migration is NOT guaranteed to work 100% with Blueprint installed.[/]");
        AnsiConsole.WriteLine();

        return AnsiConsole.Confirm(
            "[yellow]Do you want to proceed with the migration anyway?[/]",
            false
        );
    }
}

