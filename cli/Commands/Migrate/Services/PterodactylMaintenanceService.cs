using System.Diagnostics;
using System.IO;
using Microsoft.Extensions.Logging;
using Spectre.Console;

namespace FeatherCli.Commands.Migrate.Services;

public class PterodactylMaintenanceService
{
    private readonly ILogger<PterodactylMaintenanceService>? _logger;

    public PterodactylMaintenanceService(ILogger<PterodactylMaintenanceService>? logger = null)
    {
        _logger = logger;
    }

    public bool IsInMaintenanceMode(string pterodactylPath)
    {
        var downFile = Path.Combine(pterodactylPath, "storage", "framework", "down");
        return File.Exists(downFile);
    }

    public async Task<bool> SetMaintenanceModeAsync(string pterodactylPath)
    {
        try
        {
            // Check if already in maintenance mode
            if (IsInMaintenanceMode(pterodactylPath))
            {
                _logger?.LogInformation("Pterodactyl is already in maintenance mode");
                return true;
            }

            // Check if artisan file exists
            var artisanPath = Path.Combine(pterodactylPath, "artisan");
            if (!File.Exists(artisanPath))
            {
                _logger?.LogError("Artisan file not found at: {ArtisanPath}", artisanPath);
                return false;
            }

            // Run php artisan down
            var processStartInfo = new ProcessStartInfo
            {
                FileName = "php",
                Arguments = "artisan down",
                WorkingDirectory = pterodactylPath,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = processStartInfo };
            
            var outputBuilder = new System.Text.StringBuilder();
            var errorBuilder = new System.Text.StringBuilder();

            process.OutputDataReceived += (sender, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data))
                {
                    outputBuilder.AppendLine(e.Data);
                    _logger?.LogDebug("Artisan output: {Output}", e.Data);
                }
            };

            process.ErrorDataReceived += (sender, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data))
                {
                    errorBuilder.AppendLine(e.Data);
                    _logger?.LogWarning("Artisan error: {Error}", e.Data);
                }
            };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            await process.WaitForExitAsync();

            if (process.ExitCode == 0)
            {
                // Verify maintenance mode was set
                if (IsInMaintenanceMode(pterodactylPath))
                {
                    _logger?.LogInformation("Successfully set Pterodactyl to maintenance mode");
                    return true;
                }
                else
                {
                    _logger?.LogWarning("Artisan down command succeeded but maintenance file not found");
                    return false;
                }
            }
            else
            {
                var errorOutput = errorBuilder.ToString();
                _logger?.LogError("Failed to set maintenance mode. Exit code: {ExitCode}, Error: {Error}", 
                    process.ExitCode, errorOutput);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Exception while setting maintenance mode");
            return false;
        }
    }
}

