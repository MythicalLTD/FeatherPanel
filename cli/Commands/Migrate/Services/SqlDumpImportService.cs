using System.Diagnostics;
using System.Text;
using FeatherCli.Commands.Migrate.Models;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace FeatherCli.Commands.Migrate.Services;

public class SqlDumpImportService
{
    private readonly ILogger<SqlDumpImportService>? _logger;

    public SqlDumpImportService(ILogger<SqlDumpImportService>? logger = null)
    {
        _logger = logger;
    }

    public string BuildServerConnectionString(StagingDatabaseOptions options, string? database = null)
    {
        var builder = new MySqlConnectionStringBuilder
        {
            Server = options.Host,
            Port = uint.Parse(string.IsNullOrEmpty(options.Port) ? "3306" : options.Port),
            UserID = options.Username,
            Password = options.Password ?? "",
            AllowUserVariables = true,
            AllowLoadLocalInfile = false,
            CharacterSet = "utf8mb4",
            ConnectionTimeout = 60,
            DefaultCommandTimeout = 0
        };

        if (!string.IsNullOrEmpty(database))
        {
            builder.Database = database;
        }

        return builder.ConnectionString;
    }

    public async Task TestStagingConnectionAsync(StagingDatabaseOptions options)
    {
        await using var connection = new MySqlConnection(BuildServerConnectionString(options));
        await connection.OpenAsync();
        await using var command = new MySqlCommand("SELECT 1", connection);
        await command.ExecuteScalarAsync();
    }

    public async Task<string> CreateStagingDatabaseAsync(StagingDatabaseOptions options)
    {
        var databaseName = $"feathercli_ptero_{Guid.NewGuid():N}"[..48];

        await using var connection = new MySqlConnection(BuildServerConnectionString(options));
        await connection.OpenAsync();

        await using var create = new MySqlCommand(
            $"CREATE DATABASE `{databaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
            connection);
        await create.ExecuteNonQueryAsync();

        _logger?.LogInformation("Created staging database {Database}", databaseName);
        return databaseName;
    }

    public async Task ImportDumpAsync(string sqlDumpPath, StagingDatabaseOptions options, string databaseName)
    {
        if (!File.Exists(sqlDumpPath))
        {
            throw new FileNotFoundException($"SQL dump not found: {sqlDumpPath}", sqlDumpPath);
        }

        var mysqlPath = FindMysqlClient();
        if (mysqlPath != null)
        {
            await ImportDumpWithMysqlClientAsync(mysqlPath, sqlDumpPath, options, databaseName);
            return;
        }

        _logger?.LogWarning("mysql client not found; using in-process dump import");
        await ImportDumpWithConnectorAsync(sqlDumpPath, options, databaseName);
    }

    public async Task DropStagingDatabaseAsync(StagingDatabaseOptions options, string databaseName)
    {
        if (string.IsNullOrWhiteSpace(databaseName) || !databaseName.StartsWith("feathercli_ptero_", StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"Refusing to drop non-staging database: {databaseName}");
        }

        await using var connection = new MySqlConnection(BuildServerConnectionString(options));
        await connection.OpenAsync();
        await using var drop = new MySqlCommand($"DROP DATABASE IF EXISTS `{databaseName}`", connection);
        await drop.ExecuteNonQueryAsync();
        _logger?.LogInformation("Dropped staging database {Database}", databaseName);
    }

    public async Task<bool> StagingDatabaseExistsAsync(StagingDatabaseOptions options, string databaseName)
    {
        await using var connection = new MySqlConnection(BuildServerConnectionString(options));
        await connection.OpenAsync();
        await using var command = new MySqlCommand(
            "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = @name",
            connection);
        command.Parameters.AddWithValue("@name", databaseName);
        var result = await command.ExecuteScalarAsync();
        return result != null && result != DBNull.Value;
    }

    private static string? FindMysqlClient()
    {
        foreach (var candidate in new[] { "mysql", "mariadb" })
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = candidate,
                    ArgumentList = { "--version" },
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(psi);
                if (process == null)
                {
                    continue;
                }

                process.WaitForExit(5000);
                if (process.ExitCode == 0)
                {
                    return candidate;
                }
            }
            catch
            {
            }
        }

        return null;
    }

    private async Task ImportDumpWithMysqlClientAsync(
        string mysqlPath,
        string sqlDumpPath,
        StagingDatabaseOptions options,
        string databaseName)
    {
        var psi = new ProcessStartInfo
        {
            FileName = mysqlPath,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        psi.ArgumentList.Add("-h");
        psi.ArgumentList.Add(options.Host);
        psi.ArgumentList.Add("-P");
        psi.ArgumentList.Add(string.IsNullOrEmpty(options.Port) ? "3306" : options.Port);
        psi.ArgumentList.Add("-u");
        psi.ArgumentList.Add(options.Username);

        if (!string.IsNullOrEmpty(options.Password))
        {
            psi.Environment["MYSQL_PWD"] = options.Password;
        }

        psi.ArgumentList.Add("--default-character-set=utf8mb4");
        psi.ArgumentList.Add("--binary-mode=1");
        psi.ArgumentList.Add(databaseName);

        using var process = Process.Start(psi)
            ?? throw new InvalidOperationException($"Failed to start {mysqlPath}");

        await using (var file = File.OpenRead(sqlDumpPath))
        {
            await file.CopyToAsync(process.StandardInput.BaseStream);
            await process.StandardInput.BaseStream.FlushAsync();
            process.StandardInput.Close();
        }

        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            var message = string.IsNullOrWhiteSpace(stderr) ? stdout : stderr;
            throw new InvalidOperationException(
                $"Failed to import SQL dump (exit {process.ExitCode}): {Truncate(message, 2000)}");
        }

        _logger?.LogInformation("Imported SQL dump into {Database} via {Client}", databaseName, mysqlPath);
    }

    private async Task ImportDumpWithConnectorAsync(
        string sqlDumpPath,
        StagingDatabaseOptions options,
        string databaseName)
    {
        await using var connection = new MySqlConnection(BuildServerConnectionString(options, databaseName));
        await connection.OpenAsync();

        await using (var prep = new MySqlCommand(
            "SET FOREIGN_KEY_CHECKS=0; SET UNIQUE_CHECKS=0; SET sql_mode='NO_AUTO_VALUE_ON_ZERO';",
            connection))
        {
            await prep.ExecuteNonQueryAsync();
        }

        await foreach (var statement in ReadSqlStatementsAsync(sqlDumpPath))
        {
            if (string.IsNullOrWhiteSpace(statement))
            {
                continue;
            }

            var trimmed = statement.TrimStart();
            if (trimmed.StartsWith("/*", StringComparison.Ordinal) ||
                trimmed.StartsWith("--", StringComparison.Ordinal) ||
                trimmed.StartsWith("LOCK TABLES", StringComparison.OrdinalIgnoreCase) ||
                trimmed.StartsWith("UNLOCK TABLES", StringComparison.OrdinalIgnoreCase) ||
                trimmed.StartsWith("SET ", StringComparison.OrdinalIgnoreCase) ||
                trimmed.StartsWith("USE ", StringComparison.OrdinalIgnoreCase) ||
                trimmed.StartsWith("CREATE DATABASE", StringComparison.OrdinalIgnoreCase) ||
                trimmed.StartsWith("DROP DATABASE", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            try
            {
                await using var command = new MySqlCommand(statement, connection)
                {
                    CommandTimeout = 0
                };
                await command.ExecuteNonQueryAsync();
            }
            catch (MySqlException ex)
            {
                _logger?.LogWarning(ex, "Skipping statement during dump import: {Preview}", Truncate(statement, 120));
            }
        }

        await using (var post = new MySqlCommand("SET FOREIGN_KEY_CHECKS=1; SET UNIQUE_CHECKS=1;", connection))
        {
            await post.ExecuteNonQueryAsync();
        }
    }

    private static async IAsyncEnumerable<string> ReadSqlStatementsAsync(string sqlDumpPath)
    {
        await using var stream = File.OpenRead(sqlDumpPath);
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);

        var buffer = new StringBuilder();
        var inSingleQuote = false;
        var inDoubleQuote = false;
        var inBacktick = false;
        var inLineComment = false;
        var inBlockComment = false;
        var prev = '\0';
        var charBuf = new char[1];

        while (true)
        {
            var read = await reader.ReadAsync(charBuf.AsMemory());
            if (read == 0)
            {
                break;
            }

            var c = charBuf[0];

            if (inLineComment)
            {
                if (c == '\n')
                {
                    inLineComment = false;
                }
                prev = c;
                continue;
            }

            if (inBlockComment)
            {
                if (prev == '*' && c == '/')
                {
                    inBlockComment = false;
                }
                prev = c;
                continue;
            }

            if (!inSingleQuote && !inDoubleQuote && !inBacktick)
            {
                if (prev == '-' && c == '-')
                {
                    if (buffer.Length > 0 && buffer[^1] == '-')
                    {
                        buffer.Length--;
                    }
                    inLineComment = true;
                    prev = c;
                    continue;
                }

                if (prev == '/' && c == '*')
                {
                    if (buffer.Length > 0 && buffer[^1] == '/')
                    {
                        buffer.Length--;
                    }
                    inBlockComment = true;
                    prev = c;
                    continue;
                }

                if (c == '#')
                {
                    inLineComment = true;
                    prev = c;
                    continue;
                }
            }

            if (c == '\'' && !inDoubleQuote && !inBacktick && prev != '\\')
            {
                inSingleQuote = !inSingleQuote;
            }
            else if (c == '"' && !inSingleQuote && !inBacktick && prev != '\\')
            {
                inDoubleQuote = !inDoubleQuote;
            }
            else if (c == '`' && !inSingleQuote && !inDoubleQuote)
            {
                inBacktick = !inBacktick;
            }

            if (c == ';' && !inSingleQuote && !inDoubleQuote && !inBacktick)
            {
                var statement = buffer.ToString().Trim();
                buffer.Clear();
                prev = c;
                if (!string.IsNullOrWhiteSpace(statement))
                {
                    yield return statement;
                }
                continue;
            }

            buffer.Append(c);
            prev = c;
        }

        var trailing = buffer.ToString().Trim();
        if (!string.IsNullOrWhiteSpace(trailing))
        {
            yield return trailing;
        }
    }

    private static string Truncate(string value, int max)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= max)
        {
            return value;
        }

        return value[..max] + "...";
    }
}
