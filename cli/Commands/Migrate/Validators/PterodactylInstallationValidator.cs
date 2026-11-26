using System.IO;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Validators;

public class PterodactylInstallationValidator
{
    public ValidationResult ValidateInstallation(string path)
    {
        // Required files and directories for Pterodactyl
        var requiredItems = new[]
        {
            ".env",                    // Environment configuration
            "app",                     // Application directory
            "bootstrap",               // Bootstrap directory
            "database",                // Database migrations
            "routes",                  // Route definitions
            "config",                  // Configuration files
            "public",                  // Public directory
            "resources",               // Resources directory
            "storage",                 // Storage directory
            "vendor",                  // Composer dependencies
            "artisan",                 // Laravel artisan command
            "composer.json"            // Composer configuration
        };

        var foundItems = new List<string>();
        var missingItems = new List<string>();

        foreach (var item in requiredItems)
        {
            var itemPath = Path.Combine(path, item);
            if (File.Exists(itemPath) || Directory.Exists(itemPath))
            {
                foundItems.Add(item);
            }
            else
            {
                missingItems.Add(item);
            }
        }

        // We need at least some core files to consider it valid
        // At minimum, we should have .env, app/, artisan, and composer.json
        var criticalItems = new[] { ".env", "app", "artisan", "composer.json" };
        var hasCriticalItems = criticalItems.All(item =>
        {
            var itemPath = Path.Combine(path, item);
            return File.Exists(itemPath) || Directory.Exists(itemPath);
        });

        if (!hasCriticalItems)
        {
            return new ValidationResult
            {
                IsValid = false,
                ErrorMessage = "Missing critical Pterodactyl files. Expected at least: .env, app/, artisan, and composer.json"
            };
        }

        // Show what was found
        if (foundItems.Count > 0)
        {
            AnsiConsole.MarkupLine($"[green]✓ Found {foundItems.Count} Pterodactyl files/directories[/]");
        }

        if (missingItems.Count > 0)
        {
            AnsiConsole.MarkupLine($"[yellow]⚠  Missing {missingItems.Count} optional files/directories[/]");
        }

        return new ValidationResult
        {
            IsValid = true,
            ErrorMessage = null
        };
    }

    public bool CheckBlueprintDirectory(string path)
    {
        var blueprintPath = Path.Combine(path, ".blueprint");
        return Directory.Exists(blueprintPath);
    }
}

public class ValidationResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
}

