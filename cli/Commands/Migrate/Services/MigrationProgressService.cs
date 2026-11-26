using System.Text.Json;
using System.IO;
using FeatherCli.Commands.Migrate.Models;
using Microsoft.Extensions.Logging;

namespace FeatherCli.Commands.Migrate.Services;

public class MigrationProgressService
{
    private readonly string _progressFilePath;
    private readonly ILogger<MigrationProgressService>? _logger;

    public MigrationProgressService(string? customPath = null, ILogger<MigrationProgressService>? logger = null)
    {
        _logger = logger;
        
        if (!string.IsNullOrEmpty(customPath))
        {
            _progressFilePath = customPath;
        }
        else
        {
            // Default to current directory
            _progressFilePath = Path.Combine(Directory.GetCurrentDirectory(), ".migration-progress.json");
        }
    }

    public void SaveProgress(MigrationState state)
    {
        try
        {
            state.LastUpdated = DateTime.UtcNow;
            var json = JsonSerializer.Serialize(state, new JsonSerializerOptions
            {
                WriteIndented = true
            });
            
            File.WriteAllText(_progressFilePath, json);
            _logger?.LogDebug("Migration progress saved to: {Path}", _progressFilePath);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to save migration progress");
            // Don't throw - progress saving is not critical
        }
    }

    public MigrationState? LoadProgress()
    {
        try
        {
            if (!File.Exists(_progressFilePath))
            {
                return null;
            }

            var json = File.ReadAllText(_progressFilePath);
            var state = JsonSerializer.Deserialize<MigrationState>(json);
            
            _logger?.LogDebug("Migration progress loaded from: {Path}", _progressFilePath);
            return state;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to load migration progress");
            return null;
        }
    }

    public void ClearProgress()
    {
        try
        {
            if (File.Exists(_progressFilePath))
            {
                File.Delete(_progressFilePath);
                _logger?.LogDebug("Migration progress cleared");
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to clear migration progress");
        }
    }

    public string GetProgressFilePath()
    {
        return _progressFilePath;
    }
}

