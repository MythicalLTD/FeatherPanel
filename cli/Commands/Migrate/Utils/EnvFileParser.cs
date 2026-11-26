using System.Text.RegularExpressions;

namespace FeatherCli.Commands.Migrate.Utils;

public static class EnvFileParser
{
    private static readonly Regex EnvLineRegex = new(
        @"^\s*([^#=]+?)\s*=\s*(.*?)\s*$",
        RegexOptions.Compiled | RegexOptions.Multiline
    );

    public static Dictionary<string, string> ParseEnvFile(string filePath)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (!File.Exists(filePath))
        {
            return result;
        }

        var lines = File.ReadAllLines(filePath);

        foreach (var line in lines)
        {
            // Skip comments and empty lines
            if (string.IsNullOrWhiteSpace(line) || line.TrimStart().StartsWith("#"))
            {
                continue;
            }

            var match = EnvLineRegex.Match(line);
            if (match.Success)
            {
                var key = match.Groups[1].Value.Trim();
                var value = match.Groups[2].Value.Trim();

                // Remove quotes if present
                if (value.StartsWith("\"") && value.EndsWith("\""))
                {
                    value = value.Substring(1, value.Length - 2);
                }
                else if (value.StartsWith("'") && value.EndsWith("'"))
                {
                    value = value.Substring(1, value.Length - 2);
                }

                result[key] = value;
            }
        }

        return result;
    }

    public static string? GetValue(Dictionary<string, string> envVars, string key)
    {
        return envVars.TryGetValue(key, out var value) ? value : null;
    }
}

