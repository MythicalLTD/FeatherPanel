using Microsoft.Extensions.Configuration;
using System.IO;
using System.Runtime.InteropServices;

namespace FeatherCli.Core.Configuration;

public class ConfigManager
{
    private readonly IConfiguration _configuration;
    private readonly string _configPath;
    private readonly string _configFile;

    public ConfigManager()
    {
        // Use OS-appropriate config path
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            // Windows: Use %LOCALAPPDATA%\FeatherCli
            _configPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "FeatherCli"
            );
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            // macOS: Use ~/Library/Application Support/FeatherCli
            _configPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Library",
                "Application Support",
                "FeatherCli"
            );
        }
        else
        {
            // Linux: Use ~/.config/feathercli for per-user config
            _configPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                ".config",
                "feathercli"
            );
        }
        
        _configFile = Path.Combine(_configPath, ".env");
        
        _configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddEnvironmentVariables()
            .AddJsonFile("appsettings.json", optional: true)
            .Build();
    }

    public bool EnsureConfigDirectoryExists()
    {
        try
        {
            if (!Directory.Exists(_configPath))
            {
                Directory.CreateDirectory(_configPath);
                Console.WriteLine($"✓ Created configuration directory: {_configPath}");
            }
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ Failed to create configuration directory: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> EnsureConfigFileExistsAsync()
    {
        try
        {
            if (!File.Exists(_configFile))
            {
                await File.WriteAllTextAsync(_configFile, "# FeatherCli Configuration\n");
                Console.WriteLine($"✓ Created configuration file: {_configFile}");
            }
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ Failed to create configuration file: {ex.Message}");
            return false;
        }
    }

    public async Task<string?> GetApiKeyAsync()
    {
        try
        {
            if (File.Exists(_configFile))
            {
                var lines = await File.ReadAllLinesAsync(_configFile);
                foreach (var line in lines)
                {
                    if (line.StartsWith("API_KEY=", StringComparison.OrdinalIgnoreCase))
                    {
                        return line.Substring(8).Trim();
                    }
                }
            }
            return null;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ Failed to read API key: {ex.Message}");
            return null;
        }
    }

    public async Task<string?> GetApiUrlAsync()
    {
        try
        {
            if (File.Exists(_configFile))
            {
                var lines = await File.ReadAllLinesAsync(_configFile);
                foreach (var line in lines)
                {
                    if (line.StartsWith("API_URL=", StringComparison.OrdinalIgnoreCase))
                    {
                        return line.Substring(8).Trim();
                    }
                }
            }
            return null;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ Failed to read API URL: {ex.Message}");
            return null;
        }
    }

    public async Task SetApiKeyAsync(string apiKey)
    {
        try
        {
            await EnsureConfigFileExistsAsync();
            var lines = new List<string>();
            
            if (File.Exists(_configFile))
            {
                lines.AddRange(await File.ReadAllLinesAsync(_configFile));
            }

            // Remove existing API_KEY line
            lines.RemoveAll(line => line.StartsWith("API_KEY=", StringComparison.OrdinalIgnoreCase));
            
            // Add new API_KEY line
            lines.Add($"API_KEY={apiKey}");
            
            await File.WriteAllLinesAsync(_configFile, lines);
            Console.WriteLine("✓ API key saved successfully");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ Failed to save API key: {ex.Message}");
        }
    }

    public async Task SetApiUrlAsync(string apiUrl)
    {
        try
        {
            await EnsureConfigFileExistsAsync();
            var lines = new List<string>();
            
            if (File.Exists(_configFile))
            {
                lines.AddRange(await File.ReadAllLinesAsync(_configFile));
            }

            // Remove existing API_URL line
            lines.RemoveAll(line => line.StartsWith("API_URL=", StringComparison.OrdinalIgnoreCase));
            
            // Add new API_URL line
            lines.Add($"API_URL={apiUrl}");
            
            await File.WriteAllLinesAsync(_configFile, lines);
            Console.WriteLine("✓ API URL saved successfully");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ Failed to save API URL: {ex.Message}");
        }
    }

    public async Task<bool> IsConfiguredAsync()
    {
        var apiKey = await GetApiKeyAsync();
        var apiUrl = await GetApiUrlAsync();
        return !string.IsNullOrEmpty(apiKey) && !string.IsNullOrEmpty(apiUrl);
    }

    public async Task ShowConfigurationAsync()
    {
        Console.WriteLine("Current Configuration:");
        Console.WriteLine("=====================");
        
        var apiKey = await GetApiKeyAsync();
        var apiUrl = await GetApiUrlAsync();
        
        Console.WriteLine($"API URL: {(string.IsNullOrEmpty(apiUrl) ? "Not set" : apiUrl)}");
        Console.WriteLine($"API Key: {(string.IsNullOrEmpty(apiKey) ? "Not set" : "***" + apiKey.Substring(Math.Max(0, apiKey.Length - 4)))}");
        Console.WriteLine($"Config File: {_configFile}");
    }
}
