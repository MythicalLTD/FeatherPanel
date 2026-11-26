using MySqlConnector;
using FeatherCli.Commands.Migrate.Models;
using Microsoft.Extensions.Logging;

namespace FeatherCli.Commands.Migrate.Services;

public class PterodactylDatabaseService
{
    private readonly ILogger<PterodactylDatabaseService>? _logger;

    public PterodactylDatabaseService(ILogger<PterodactylDatabaseService>? logger = null)
    {
        _logger = logger;
    }

    public string BuildConnectionString(PterodactylConfig config)
    {
        if (string.IsNullOrEmpty(config.DbHost) || 
            string.IsNullOrEmpty(config.DbDatabase) || 
            string.IsNullOrEmpty(config.DbUsername))
        {
            throw new InvalidOperationException("Database configuration is incomplete. Required: DB_HOST, DB_DATABASE, DB_USERNAME");
        }

        var password = config.DbPassword ?? "";

        var builder = new MySqlConnectionStringBuilder
        {
            Database = config.DbDatabase,
            UserID = config.DbUsername,
            Password = password,
            AllowUserVariables = true,
            AllowLoadLocalInfile = false
        };

        // Check if DB_HOST is a Unix socket path (starts with /)
        // This matches Laravel/PHP behavior where socket paths are used directly
        if (config.DbHost.StartsWith("/"))
        {
            // Unix socket connection - use the socket path directly
            // MySqlConnector will automatically detect this as a socket path
            builder.Server = config.DbHost;
            // Don't set Port for Unix socket connections
        }
        else
        {
            // TCP/IP connection
            builder.Server = config.DbHost;
            var port = string.IsNullOrEmpty(config.DbPort) ? "3306" : config.DbPort;
            builder.Port = uint.Parse(port);
        }

        return builder.ConnectionString;
    }

    public async Task<bool> TestConnectionAsync(PterodactylConfig config)
    {
        try
        {
            var connectionString = BuildConnectionString(config);
            
            await using var connection = new MySqlConnection(connectionString);
            await connection.OpenAsync();
            
            // Test with a simple query
            await using var command = new MySqlCommand("SELECT 1", connection);
            await command.ExecuteScalarAsync();
            
            _logger?.LogInformation("Successfully connected to Pterodactyl database");
            return true;
        }
        catch (MySqlException ex)
        {
            _logger?.LogError(ex, "Failed to connect to Pterodactyl database: {ErrorCode} - {Message}", ex.Number, ex.Message);
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Unexpected error while connecting to Pterodactyl database");
            throw;
        }
    }

    public async Task<MySqlConnection> GetConnectionAsync(PterodactylConfig config)
    {
        var connectionString = BuildConnectionString(config);
        var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();
        return connection;
    }

    public static string[] GetRequiredTables()
    {
        return new[]
        {
            // Core objects
            "allocations",
            "backups",
            "database_hosts",
            "databases",
            "eggs",
            "egg_variables",
            "locations",
            "nests",
            "nodes",
            "servers",
            "server_variables",
            "schedules",
            "subusers",
            "tasks",
            "users",
            "user_ssh_keys",
            "settings"
        };
    }

    public async Task<TableCheckResult> CheckRequiredTablesAsync(PterodactylConfig config)
    {
        var requiredTables = GetRequiredTables();
        var existingTables = new List<string>();
        var missingTables = new List<string>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            // Get all tables in the database
            await using var tablesCommand = new MySqlCommand(
                "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
                connection
            );
            
            await using var reader = await tablesCommand.ExecuteReaderAsync();
            var allTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            
            while (await reader.ReadAsync())
            {
                var tableName = reader.GetString(0);
                allTables.Add(tableName);
            }

            // Check which required tables exist
            foreach (var table in requiredTables)
            {
                if (allTables.Contains(table))
                {
                    existingTables.Add(table);
                }
                else
                {
                    missingTables.Add(table);
                }
            }

            _logger?.LogInformation(
                "Table check completed: {ExistingCount} existing, {MissingCount} missing",
                existingTables.Count,
                missingTables.Count
            );

            return new TableCheckResult
            {
                ExistingTables = existingTables,
                MissingTables = missingTables,
                AllTablesExist = missingTables.Count == 0
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to check required tables");
            throw;
        }
    }

    public async Task<string?> GetSettingValueAsync(PterodactylConfig config, string settingKey)
    {
        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `value` FROM `settings` WHERE `key` = @key LIMIT 1",
                connection
            );
            
            command.Parameters.AddWithValue("@key", settingKey);
            
            var result = await command.ExecuteScalarAsync();
            
            if (result == null || result == DBNull.Value)
            {
                _logger?.LogWarning("Setting not found: {SettingKey}", settingKey);
                return null;
            }

            return result.ToString();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read setting {SettingKey}", settingKey);
            throw;
        }
    }

    public async Task<List<PterodactylSetting>> GetAllSettingsAsync(PterodactylConfig config)
    {
        var settings = new List<PterodactylSetting>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `key`, `value` FROM `settings` ORDER BY `key`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                settings.Add(new PterodactylSetting
                {
                    Id = ReadMysqlIntAsInt32(reader, 0, nameof(PterodactylSetting.Id)),
                    Key = reader.GetString(1),
                    Value = reader.IsDBNull(2) ? null : reader.GetString(2)
                });
            }

            _logger?.LogInformation("Loaded {Count} settings from database", settings.Count);
            return settings;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read settings from database");
            throw;
        }
    }

    public async Task<List<PterodactylLocation>> GetLocationsAsync(PterodactylConfig config)
    {
        var locations = new List<PterodactylLocation>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `short`, `long`, `created_at`, `updated_at` FROM `locations` ORDER BY `id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                locations.Add(new PterodactylLocation
                {
                    Id = ReadMysqlIntAsInt32(reader, 0, nameof(PterodactylLocation.Id)),
                    Short = reader.GetString(1),
                    Long = reader.IsDBNull(2) ? null : reader.GetString(2),
                    CreatedAt = reader.IsDBNull(3) ? null : reader.GetDateTime(3),
                    UpdatedAt = reader.IsDBNull(4) ? null : reader.GetDateTime(4)
                });
            }

            _logger?.LogInformation("Loaded {Count} locations from database", locations.Count);
            return locations;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read locations from database");
            throw;
        }
    }

    public async Task<List<PterodactylNest>> GetNestsAsync(PterodactylConfig config)
    {
        var nests = new List<PterodactylNest>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `uuid`, `author`, `name`, `description`, `created_at`, `updated_at` FROM `nests` ORDER BY `id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                nests.Add(new PterodactylNest
                {
                    Id = ReadMysqlIntAsInt32(reader, 0, nameof(PterodactylNest.Id)),
                    Uuid = reader.GetGuid(1).ToString(),
                    Author = reader.GetString(2),
                    Name = reader.GetString(3),
                    Description = reader.IsDBNull(4) ? null : reader.GetString(4),
                    CreatedAt = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                    UpdatedAt = reader.IsDBNull(6) ? null : reader.GetDateTime(6)
                });
            }

            _logger?.LogInformation("Loaded {Count} nests from database", nests.Count);
            return nests;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read nests from database");
            throw;
        }
    }

    public async Task<List<PterodactylEgg>> GetEggsWithVariablesAsync(PterodactylConfig config)
    {
        var eggs = new List<PterodactylEgg>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            // First, get all eggs
            await using var eggsCommand = new MySqlCommand(
                "SELECT `id`, `uuid`, `nest_id`, `author`, `name`, `description`, `features`, `docker_images`, `file_denylist`, `update_url`, `config_files`, `config_startup`, `config_logs`, `config_stop`, `config_from`, `startup`, `script_container`, `copy_script_from`, `script_entry`, `script_is_privileged`, `script_install`, `created_at`, `updated_at`, `force_outgoing_ip` FROM `eggs` ORDER BY `id`",
                connection
            );
            
            await using var eggsReader = await eggsCommand.ExecuteReaderAsync();
            
            while (await eggsReader.ReadAsync())
            {
                var egg = new PterodactylEgg
                {
                    Id = ReadMysqlIntAsInt32(eggsReader, 0, nameof(PterodactylEgg.Id)),
                    Uuid = eggsReader.GetGuid(1).ToString(),
                    NestId = ReadMysqlIntAsInt32(eggsReader, 2, nameof(PterodactylEgg.NestId)),
                    Author = eggsReader.GetString(3),
                    Name = eggsReader.GetString(4),
                    Description = eggsReader.IsDBNull(5) ? null : eggsReader.GetString(5),
                    Features = eggsReader.IsDBNull(6) ? null : eggsReader.GetString(6),
                    DockerImages = eggsReader.IsDBNull(7) ? null : eggsReader.GetString(7),
                    FileDenylist = eggsReader.IsDBNull(8) ? null : eggsReader.GetString(8),
                    UpdateUrl = eggsReader.IsDBNull(9) ? null : eggsReader.GetString(9),
                    ConfigFiles = eggsReader.IsDBNull(10) ? null : eggsReader.GetString(10),
                    ConfigStartup = eggsReader.IsDBNull(11) ? null : eggsReader.GetString(11),
                    ConfigLogs = eggsReader.IsDBNull(12) ? null : eggsReader.GetString(12),
                    ConfigStop = eggsReader.IsDBNull(13) ? null : eggsReader.GetString(13),
                    ConfigFrom = ReadMysqlIntAsInt32OrNull(eggsReader, 14, nameof(PterodactylEgg.ConfigFrom)),
                    Startup = eggsReader.IsDBNull(15) ? null : eggsReader.GetString(15),
                    ScriptContainer = eggsReader.GetString(16),
                    CopyScriptFrom = ReadMysqlIntAsInt32OrNull(eggsReader, 17, nameof(PterodactylEgg.CopyScriptFrom)),
                    ScriptEntry = eggsReader.GetString(18),
                    ScriptIsPrivileged = eggsReader.GetBoolean(19),
                    ScriptInstall = eggsReader.IsDBNull(20) ? null : eggsReader.GetString(20),
                    CreatedAt = eggsReader.IsDBNull(21) ? null : eggsReader.GetDateTime(21),
                    UpdatedAt = eggsReader.IsDBNull(22) ? null : eggsReader.GetDateTime(22),
                    ForceOutgoingIp = eggsReader.GetBoolean(23)
                };
                
                eggs.Add(egg);
            }
            
            await eggsReader.CloseAsync();
            
            // Now get variables for each egg
            foreach (var egg in eggs)
            {
                await using var varsCommand = new MySqlCommand(
                    "SELECT `id`, `egg_id`, `name`, `description`, `env_variable`, `default_value`, `user_viewable`, `user_editable`, `rules`, `created_at`, `updated_at` FROM `egg_variables` WHERE `egg_id` = @eggId ORDER BY `id`",
                    connection
                );
                varsCommand.Parameters.AddWithValue("@eggId", egg.Id);
                
                await using var varsReader = await varsCommand.ExecuteReaderAsync();
                
                while (await varsReader.ReadAsync())
                {
                    egg.Variables.Add(new PterodactylEggVariable
                    {
                        Id = ReadMysqlIntAsInt32(varsReader, 0, nameof(PterodactylEggVariable.Id)),
                        EggId = ReadMysqlIntAsInt32(varsReader, 1, nameof(PterodactylEggVariable.EggId)),
                        Name = varsReader.GetString(2),
                        Description = varsReader.GetString(3),
                        EnvVariable = varsReader.GetString(4),
                        DefaultValue = varsReader.GetString(5),
                        UserViewable = varsReader.GetBoolean(6),
                        UserEditable = varsReader.GetBoolean(7),
                        Rules = varsReader.IsDBNull(8) ? null : varsReader.GetString(8),
                        CreatedAt = varsReader.IsDBNull(9) ? null : varsReader.GetDateTime(9),
                        UpdatedAt = varsReader.IsDBNull(10) ? null : varsReader.GetDateTime(10)
                    });
                }
            }

            _logger?.LogInformation("Loaded {Count} eggs with variables from database", eggs.Count);
            return eggs;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read eggs from database");
            throw;
        }
    }

    public async Task<List<PterodactylNode>> GetNodesAsync(PterodactylConfig config)
    {
        var nodes = new List<PterodactylNode>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `uuid`, `public`, `name`, `description`, `location_id`, `fqdn`, `scheme`, `behind_proxy`, `maintenance_mode`, `memory`, `memory_overallocate`, `disk`, `disk_overallocate`, `upload_size`, `daemon_token_id`, `daemon_token`, `daemonListen`, `daemonSFTP`, `daemonBase`, `created_at`, `updated_at` FROM `nodes` ORDER BY `id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                nodes.Add(new PterodactylNode
                {
                    Id = ReadMysqlIntAsInt32(reader, 0, nameof(PterodactylNode.Id)),
                    Uuid = reader.GetGuid(1).ToString(),
                    Public = reader.GetBoolean(2),
                    Name = reader.GetString(3),
                    Description = reader.IsDBNull(4) ? null : reader.GetString(4),
                    LocationId = ReadMysqlIntAsInt32(reader, 5, nameof(PterodactylNode.LocationId)),
                    Fqdn = reader.GetString(6),
                    Scheme = reader.GetString(7),
                    BehindProxy = reader.GetBoolean(8),
                    MaintenanceMode = reader.GetBoolean(9),
                    Memory = ReadMysqlIntAsInt32(reader, 10, nameof(PterodactylNode.Memory)),
                    MemoryOverallocate = reader.IsDBNull(11)
                        ? 0
                        : ReadMysqlIntAsInt32(reader, 11, nameof(PterodactylNode.MemoryOverallocate)),
                    Disk = ReadMysqlIntAsInt32(reader, 12, nameof(PterodactylNode.Disk)),
                    DiskOverallocate = reader.IsDBNull(13)
                        ? 0
                        : ReadMysqlIntAsInt32(reader, 13, nameof(PterodactylNode.DiskOverallocate)),
                    UploadSize = ReadMysqlIntAsInt32(reader, 14, nameof(PterodactylNode.UploadSize)),
                    DaemonTokenId = reader.GetString(15),
                    DaemonToken = reader.GetString(16), // Encrypted
                    DaemonListen = ReadMysqlIntAsInt32(reader, 17, nameof(PterodactylNode.DaemonListen)),
                    DaemonSFTP = ReadMysqlIntAsInt32(reader, 18, nameof(PterodactylNode.DaemonSFTP)),
                    DaemonBase = reader.GetString(19),
                    CreatedAt = reader.IsDBNull(20) ? null : reader.GetDateTime(20),
                    UpdatedAt = reader.IsDBNull(21) ? null : reader.GetDateTime(21)
                });
            }

            _logger?.LogInformation("Loaded {Count} nodes from database", nodes.Count);
            return nodes;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read nodes from database");
            throw;
        }
    }

    public async Task<List<PterodactylDatabaseHost>> GetDatabaseHostsAsync(PterodactylConfig config)
    {
        var hosts = new List<PterodactylDatabaseHost>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `name`, `host`, `port`, `username`, `password`, `max_databases`, `node_id`, `created_at`, `updated_at` FROM `database_hosts` ORDER BY `id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                hosts.Add(new PterodactylDatabaseHost
                {
                    Id = ReadMysqlIntAsInt32(reader, 0, nameof(PterodactylDatabaseHost.Id)),
                    Name = reader.GetString(1),
                    Host = reader.GetString(2),
                    Port = ReadMysqlIntAsInt32(reader, 3, nameof(PterodactylDatabaseHost.Port)),
                    Username = reader.GetString(4),
                    Password = reader.GetString(5), // Encrypted
                    MaxDatabases = ReadMysqlIntAsInt32OrNull(reader, 6, nameof(PterodactylDatabaseHost.MaxDatabases)),
                    NodeId = ReadMysqlIntAsInt32OrNull(reader, 7, nameof(PterodactylDatabaseHost.NodeId)),
                    CreatedAt = reader.IsDBNull(8) ? null : reader.GetDateTime(8),
                    UpdatedAt = reader.IsDBNull(9) ? null : reader.GetDateTime(9)
                });
            }

            _logger?.LogInformation("Loaded {Count} database hosts from database", hosts.Count);
            return hosts;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read database hosts from database");
            throw;
        }
    }

    public async Task<List<PterodactylAllocation>> GetAllocationsAsync(PterodactylConfig config)
    {
        var allocations = new List<PterodactylAllocation>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `node_id`, `ip`, `ip_alias`, `port`, `server_id`, `notes`, `created_at`, `updated_at` FROM `allocations` ORDER BY `id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                allocations.Add(new PterodactylAllocation
                {
                    Id = ReadMysqlIntAsInt32(reader, 0, nameof(PterodactylAllocation.Id)),
                    NodeId = ReadMysqlIntAsInt32(reader, 1, nameof(PterodactylAllocation.NodeId)),
                    Ip = reader.GetString(2),
                    IpAlias = reader.IsDBNull(3) ? null : reader.GetString(3),
                    Port = ReadMysqlIntAsInt32(reader, 4, nameof(PterodactylAllocation.Port)),
                    ServerId = ReadMysqlIntAsInt32OrNull(reader, 5, nameof(PterodactylAllocation.ServerId)),
                    Notes = reader.IsDBNull(6) ? null : reader.GetString(6),
                    CreatedAt = reader.IsDBNull(7) ? null : reader.GetDateTime(7),
                    UpdatedAt = reader.IsDBNull(8) ? null : reader.GetDateTime(8)
                });
            }

            _logger?.LogInformation("Loaded {Count} allocations from database", allocations.Count);
            return allocations;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read allocations from database");
            throw;
        }
    }

    public async Task<List<PterodactylUser>> GetUsersAsync(PterodactylConfig config)
    {
        var users = new List<PterodactylUser>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `uuid`, `username`, `email`, `name_first`, `name_last`, `password`, `remember_token`, `external_id`, `root_admin`, `use_totp`, `totp_secret`, `language`, `created_at`, `updated_at` FROM `users` ORDER BY `id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                users.Add(new PterodactylUser
                {
                    Id = ReadMysqlIntAsInt32(reader, 0, nameof(PterodactylUser.Id)),
                    Uuid = reader.GetGuid(1).ToString(), // UUID is stored as GUID in database
                    Username = reader.GetString(2),
                    Email = reader.GetString(3),
                    NameFirst = reader.IsDBNull(4) ? null : reader.GetString(4),
                    NameLast = reader.IsDBNull(5) ? null : reader.GetString(5),
                    Password = reader.GetString(6),
                    RememberToken = reader.IsDBNull(7) ? null : reader.GetString(7),
                    ExternalId = reader.IsDBNull(8) ? null : reader.GetString(8),
                    RootAdmin = reader.GetBoolean(9),
                    UseTotp = reader.GetBoolean(10),
                    TotpSecret = reader.IsDBNull(11) ? null : reader.GetString(11),
                    Language = reader.IsDBNull(12) ? null : reader.GetString(12),
                    CreatedAt = reader.IsDBNull(13) ? null : reader.GetDateTime(13),
                    UpdatedAt = reader.IsDBNull(14) ? null : reader.GetDateTime(14)
                });
            }

            _logger?.LogInformation("Loaded {Count} users from database", users.Count);
            return users;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read users from database");
            throw;
        }
    }

    public async Task<List<PterodactylSshKey>> GetSshKeysAsync(PterodactylConfig config)
    {
        var sshKeys = new List<PterodactylSshKey>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `user_id`, `name`, `fingerprint`, `public_key`, `created_at`, `updated_at`, `deleted_at` FROM `user_ssh_keys` WHERE `deleted_at` IS NULL ORDER BY `id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                sshKeys.Add(new PterodactylSshKey
                {
                    Id = ReadMysqlIntAsInt32(reader, 0, nameof(PterodactylSshKey.Id)),
                    UserId = ReadMysqlIntAsInt32(reader, 1, nameof(PterodactylSshKey.UserId)),
                    Name = reader.GetString(2),
                    Fingerprint = reader.GetString(3),
                    PublicKey = reader.GetString(4),
                    CreatedAt = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                    UpdatedAt = reader.IsDBNull(6) ? null : reader.GetDateTime(6),
                    DeletedAt = reader.IsDBNull(7) ? null : reader.GetDateTime(7)
                });
            }

            _logger?.LogInformation("Loaded {Count} SSH keys from database", sshKeys.Count);
            return sshKeys;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read SSH keys from database");
            throw;
        }
    }

    private async Task<bool> ColumnExistsAsync(MySqlConnection connection, string tableName, string columnName)
    {
        await using var command = new MySqlCommand(
            "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tableName AND COLUMN_NAME = @columnName",
            connection
        );
        command.Parameters.AddWithValue("@tableName", tableName);
        command.Parameters.AddWithValue("@columnName", columnName);
        
        var result = await command.ExecuteScalarAsync();
        return Convert.ToInt32(result) > 0;
    }

    public async Task<List<PterodactylServer>> GetServersAsync(PterodactylConfig config)
    {
        var servers = new List<PterodactylServer>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            // Check if parent_id column exists
            var hasParentIdColumn = await ColumnExistsAsync(connection, "servers", "parent_id");
            
            // Build SELECT query conditionally
            var selectColumns = "`id`, `uuid`, `uuidShort`, `node_id`, `name`, `description`, `status`, `skip_scripts`, `owner_id`, `memory`, `swap`, `disk`, `io`, `cpu`, `threads`, `oom_disabled`, `allocation_id`, `nest_id`, `egg_id`, `startup`, `image`, `allocation_limit`, `database_limit`, `backup_limit`";
            if (hasParentIdColumn)
            {
                selectColumns += ", `parent_id`";
            }
            selectColumns += ", `external_id`, `installed_at`, `created_at`, `updated_at`";
            
            await using var command = new MySqlCommand(
                $"SELECT {selectColumns} FROM `servers` ORDER BY `id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                int? parentId = null;
                if (hasParentIdColumn)
                {
                    var parentIdOrdinal = reader.GetOrdinal("parent_id");
                    parentId = ReadMysqlIntAsInt32OrNull(reader, parentIdOrdinal, nameof(PterodactylServer.ParentId));
                }
                
                servers.Add(new PterodactylServer
                {
                    Id = ReadMysqlIntAsInt32(reader, "id", nameof(PterodactylServer.Id)),
                    Uuid = reader.GetGuid(reader.GetOrdinal("uuid")).ToString(), // UUID is stored as GUID
                    UuidShort = reader.GetString(reader.GetOrdinal("uuidShort")),
                    NodeId = ReadMysqlIntAsInt32(reader, "node_id", nameof(PterodactylServer.NodeId)),
                    Name = reader.GetString(reader.GetOrdinal("name")),
                    Description = reader.IsDBNull(reader.GetOrdinal("description")) ? null : reader.GetString(reader.GetOrdinal("description")),
                    Status = reader.IsDBNull(reader.GetOrdinal("status")) ? null : reader.GetString(reader.GetOrdinal("status")),
                    SkipScripts = reader.GetBoolean(reader.GetOrdinal("skip_scripts")),
                    OwnerId = ReadMysqlIntAsInt32(reader, "owner_id", nameof(PterodactylServer.OwnerId)),
                    Memory = ReadMysqlIntAsInt32(reader, "memory", nameof(PterodactylServer.Memory)),
                    Swap = ReadMysqlIntAsInt32(reader, "swap", nameof(PterodactylServer.Swap)),
                    Disk = ReadMysqlIntAsInt32(reader, "disk", nameof(PterodactylServer.Disk)),
                    Io = ReadMysqlIntAsInt32(reader, "io", nameof(PterodactylServer.Io)),
                    Cpu = ReadMysqlIntAsInt32(reader, "cpu", nameof(PterodactylServer.Cpu)),
                    Threads = reader.IsDBNull(reader.GetOrdinal("threads")) ? null : reader.GetString(reader.GetOrdinal("threads")),
                    OomDisabled = reader.GetBoolean(reader.GetOrdinal("oom_disabled")),
                    AllocationId = ReadMysqlIntAsInt32(reader, "allocation_id", nameof(PterodactylServer.AllocationId)),
                    NestId = ReadMysqlIntAsInt32(reader, "nest_id", nameof(PterodactylServer.NestId)),
                    EggId = ReadMysqlIntAsInt32(reader, "egg_id", nameof(PterodactylServer.EggId)),
                    Startup = reader.GetString(reader.GetOrdinal("startup")),
                    Image = reader.GetString(reader.GetOrdinal("image")),
                    AllocationLimit = ReadMysqlIntAsInt32OrNull(reader, "allocation_limit", nameof(PterodactylServer.AllocationLimit)),
                    DatabaseLimit = ReadMysqlIntAsInt32(reader, "database_limit", nameof(PterodactylServer.DatabaseLimit)),
                    BackupLimit = ReadMysqlIntAsInt32(reader, "backup_limit", nameof(PterodactylServer.BackupLimit)),
                    ParentId = parentId,
                    ExternalId = reader.IsDBNull(reader.GetOrdinal("external_id")) ? null : reader.GetString(reader.GetOrdinal("external_id")),
                    InstalledAt = reader.IsDBNull(reader.GetOrdinal("installed_at")) ? null : reader.GetDateTime(reader.GetOrdinal("installed_at")),
                    CreatedAt = reader.IsDBNull(reader.GetOrdinal("created_at")) ? null : reader.GetDateTime(reader.GetOrdinal("created_at")),
                    UpdatedAt = reader.IsDBNull(reader.GetOrdinal("updated_at")) ? null : reader.GetDateTime(reader.GetOrdinal("updated_at"))
                });
            }

            _logger?.LogInformation("Loaded {Count} servers from database", servers.Count);
            return servers;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read servers from database");
            throw;
        }
    }

    public async Task<List<PterodactylServerVariable>> GetServerVariablesAsync(PterodactylConfig config, int serverId)
    {
        var variables = new List<PterodactylServerVariable>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `server_id`, `variable_id`, `variable_value`, `created_at`, `updated_at` FROM `server_variables` WHERE `server_id` = @serverId ORDER BY `id`",
                connection
            );
            
            command.Parameters.AddWithValue("@serverId", serverId);
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                variables.Add(new PterodactylServerVariable
                {
                    Id = ReadMysqlIntAsInt32(reader, 0, nameof(PterodactylServerVariable.Id)),
                    ServerId = ReadMysqlIntAsInt32(reader, 1, nameof(PterodactylServerVariable.ServerId)),
                    VariableId = ReadMysqlIntAsInt32(reader, 2, nameof(PterodactylServerVariable.VariableId)), // egg_variable_id
                    VariableValue = reader.GetString(3),
                    CreatedAt = reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                    UpdatedAt = reader.IsDBNull(5) ? null : reader.GetDateTime(5)
                });
            }

            return variables;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read server variables for server {ServerId}", serverId);
            throw;
        }
    }

    public async Task<List<PterodactylServerDatabase>> GetServerDatabasesAsync(PterodactylConfig config)
    {
        var databases = new List<PterodactylServerDatabase>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `server_id`, `database_host_id`, `database`, `username`, `remote`, `password`, `max_connections`, `created_at`, `updated_at` FROM `databases` ORDER BY `id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                databases.Add(new PterodactylServerDatabase
                {
                    Id = ReadMysqlIntAsInt32(reader, "id", nameof(PterodactylServerDatabase.Id)),
                    ServerId = ReadMysqlIntAsInt32(reader, "server_id", nameof(PterodactylServerDatabase.ServerId)),
                    DatabaseHostId = ReadMysqlIntAsInt32(reader, "database_host_id", nameof(PterodactylServerDatabase.DatabaseHostId)),
                    Database = reader.GetString(reader.GetOrdinal("database")),
                    Username = reader.GetString(reader.GetOrdinal("username")),
                    Remote = reader.IsDBNull(reader.GetOrdinal("remote")) ? "%" : reader.GetString(reader.GetOrdinal("remote")),
                    Password = reader.GetString(reader.GetOrdinal("password")), // Encrypted
                    MaxConnections = ReadMysqlIntAsInt32OrNull(reader, "max_connections", nameof(PterodactylServerDatabase.MaxConnections)) ?? 0,
                    CreatedAt = reader.IsDBNull(reader.GetOrdinal("created_at")) ? null : reader.GetDateTime(reader.GetOrdinal("created_at")),
                    UpdatedAt = reader.IsDBNull(reader.GetOrdinal("updated_at")) ? null : reader.GetDateTime(reader.GetOrdinal("updated_at"))
                });
            }

            _logger?.LogInformation("Loaded {Count} server databases from database", databases.Count);
            return databases;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read server databases from database");
            throw;
        }
    }

    public async Task<List<PterodactylBackup>> GetBackupsAsync(PterodactylConfig config)
    {
        var backups = new List<PterodactylBackup>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            // Only get non-deleted backups
            await using var command = new MySqlCommand(
                "SELECT `id`, `server_id`, `uuid`, `upload_id`, `is_successful`, `is_locked`, `name`, `ignored_files`, `disk`, `checksum`, `bytes`, `completed_at`, `created_at`, `updated_at` FROM `backups` WHERE `deleted_at` IS NULL ORDER BY `id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                backups.Add(new PterodactylBackup
                {
                    Id = reader.GetInt64(reader.GetOrdinal("id")),
                    ServerId = ReadMysqlIntAsInt32(reader, "server_id", nameof(PterodactylBackup.ServerId)),
                    Uuid = reader.GetGuid(reader.GetOrdinal("uuid")).ToString(),
                    UploadId = reader.IsDBNull(reader.GetOrdinal("upload_id")) ? null : reader.GetString(reader.GetOrdinal("upload_id")),
                    IsSuccessful = reader.GetBoolean(reader.GetOrdinal("is_successful")),
                    IsLocked = reader.GetBoolean(reader.GetOrdinal("is_locked")),
                    Name = reader.GetString(reader.GetOrdinal("name")),
                    IgnoredFiles = reader.IsDBNull(reader.GetOrdinal("ignored_files")) ? "[]" : reader.GetString(reader.GetOrdinal("ignored_files")),
                    Disk = reader.IsDBNull(reader.GetOrdinal("disk")) ? "wings" : reader.GetString(reader.GetOrdinal("disk")),
                    Checksum = reader.IsDBNull(reader.GetOrdinal("checksum")) ? null : reader.GetString(reader.GetOrdinal("checksum")),
                    Bytes = reader.GetInt64(reader.GetOrdinal("bytes")),
                    CompletedAt = reader.IsDBNull(reader.GetOrdinal("completed_at")) ? null : reader.GetDateTime(reader.GetOrdinal("completed_at")),
                    CreatedAt = reader.IsDBNull(reader.GetOrdinal("created_at")) ? null : reader.GetDateTime(reader.GetOrdinal("created_at")),
                    UpdatedAt = reader.IsDBNull(reader.GetOrdinal("updated_at")) ? null : reader.GetDateTime(reader.GetOrdinal("updated_at"))
                });
            }

            _logger?.LogInformation("Loaded {Count} backups from database", backups.Count);
            return backups;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read backups from database");
            throw;
        }
    }

    public async Task<List<PterodactylSubuser>> GetSubusersAsync(PterodactylConfig config)
    {
        var subusers = new List<PterodactylSubuser>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `user_id`, `server_id`, `permissions`, `created_at`, `updated_at` FROM `subusers` ORDER BY `id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                subusers.Add(new PterodactylSubuser
                {
                    Id = ReadMysqlIntAsInt32(reader, "id", nameof(PterodactylSubuser.Id)),
                    UserId = ReadMysqlIntAsInt32(reader, "user_id", nameof(PterodactylSubuser.UserId)),
                    ServerId = ReadMysqlIntAsInt32(reader, "server_id", nameof(PterodactylSubuser.ServerId)),
                    Permissions = reader.IsDBNull(reader.GetOrdinal("permissions")) ? "[]" : reader.GetString(reader.GetOrdinal("permissions")),
                    CreatedAt = reader.IsDBNull(reader.GetOrdinal("created_at")) ? null : reader.GetDateTime(reader.GetOrdinal("created_at")),
                    UpdatedAt = reader.IsDBNull(reader.GetOrdinal("updated_at")) ? null : reader.GetDateTime(reader.GetOrdinal("updated_at"))
                });
            }

            _logger?.LogInformation("Loaded {Count} subusers from database", subusers.Count);
            return subusers;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read subusers from database");
            throw;
        }
    }

    public async Task<List<PterodactylSchedule>> GetSchedulesAsync(PterodactylConfig config)
    {
        var schedules = new List<PterodactylSchedule>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `server_id`, `name`, `cron_day_of_week`, `cron_month`, `cron_day_of_month`, `cron_hour`, `cron_minute`, `is_active`, `is_processing`, `only_when_online`, `last_run_at`, `next_run_at`, `created_at`, `updated_at` FROM `schedules` ORDER BY `id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                schedules.Add(new PterodactylSchedule
                {
                    Id = ReadMysqlIntAsInt32(reader, "id", nameof(PterodactylSchedule.Id)),
                    ServerId = ReadMysqlIntAsInt32(reader, "server_id", nameof(PterodactylSchedule.ServerId)),
                    Name = reader.GetString(reader.GetOrdinal("name")),
                    CronDayOfWeek = reader.GetString(reader.GetOrdinal("cron_day_of_week")),
                    CronMonth = reader.GetString(reader.GetOrdinal("cron_month")),
                    CronDayOfMonth = reader.GetString(reader.GetOrdinal("cron_day_of_month")),
                    CronHour = reader.GetString(reader.GetOrdinal("cron_hour")),
                    CronMinute = reader.GetString(reader.GetOrdinal("cron_minute")),
                    IsActive = reader.GetBoolean(reader.GetOrdinal("is_active")),
                    IsProcessing = reader.GetBoolean(reader.GetOrdinal("is_processing")),
                    OnlyWhenOnline = ReadMysqlIntAsInt32(reader, "only_when_online", nameof(PterodactylSchedule.OnlyWhenOnline)),
                    LastRunAt = reader.IsDBNull(reader.GetOrdinal("last_run_at")) ? null : reader.GetDateTime(reader.GetOrdinal("last_run_at")),
                    NextRunAt = reader.IsDBNull(reader.GetOrdinal("next_run_at")) ? null : reader.GetDateTime(reader.GetOrdinal("next_run_at")),
                    CreatedAt = reader.IsDBNull(reader.GetOrdinal("created_at")) ? null : reader.GetDateTime(reader.GetOrdinal("created_at")),
                    UpdatedAt = reader.IsDBNull(reader.GetOrdinal("updated_at")) ? null : reader.GetDateTime(reader.GetOrdinal("updated_at"))
                });
            }

            _logger?.LogInformation("Loaded {Count} schedules from database", schedules.Count);
            return schedules;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read schedules from database");
            throw;
        }
    }

    public async Task<List<PterodactylTask>> GetTasksAsync(PterodactylConfig config)
    {
        var tasks = new List<PterodactylTask>();

        try
        {
            await using var connection = await GetConnectionAsync(config);
            
            await using var command = new MySqlCommand(
                "SELECT `id`, `schedule_id`, `sequence_id`, `action`, `payload`, `time_offset`, `is_queued`, `continue_on_failure`, `created_at`, `updated_at` FROM `tasks` ORDER BY `schedule_id`, `sequence_id`",
                connection
            );
            
            await using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                tasks.Add(new PterodactylTask
                {
                    Id = ReadMysqlIntAsInt32(reader, "id", nameof(PterodactylTask.Id)),
                    ScheduleId = ReadMysqlIntAsInt32(reader, "schedule_id", nameof(PterodactylTask.ScheduleId)),
                    SequenceId = ReadMysqlIntAsInt32(reader, "sequence_id", nameof(PterodactylTask.SequenceId)),
                    Action = reader.GetString(reader.GetOrdinal("action")),
                    Payload = reader.GetString(reader.GetOrdinal("payload")),
                    TimeOffset = ReadMysqlIntAsInt32(reader, "time_offset", nameof(PterodactylTask.TimeOffset)),
                    IsQueued = reader.GetBoolean(reader.GetOrdinal("is_queued")),
                    ContinueOnFailure = ReadMysqlIntAsInt32(reader, "continue_on_failure", nameof(PterodactylTask.ContinueOnFailure)),
                    CreatedAt = reader.IsDBNull(reader.GetOrdinal("created_at")) ? null : reader.GetDateTime(reader.GetOrdinal("created_at")),
                    UpdatedAt = reader.IsDBNull(reader.GetOrdinal("updated_at")) ? null : reader.GetDateTime(reader.GetOrdinal("updated_at"))
                });
            }

            _logger?.LogInformation("Loaded {Count} tasks from database", tasks.Count);
            return tasks;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to read tasks from database");
            throw;
        }
    }

    /// <summary>
    /// Reads integer-like MySQL values (signed/unsigned INT and smaller integer types) into int.
    /// <see cref="MySqlDataReader.GetInt32(int)"/> throws <see cref="OverflowException"/> on UNSIGNED values above <see cref="int.MaxValue"/>.
    /// </summary>
    private int ReadMysqlIntAsInt32(MySqlDataReader reader, int ordinal, string fieldName)
    {
        var v = reader.GetInt64(ordinal);
        if (v > int.MaxValue)
        {
            _logger?.LogWarning(
                "MySQL integer value exceeds Int32.MaxValue (field: {FieldName}, value: {Value}); clamping for migration.",
                fieldName,
                v);
            return int.MaxValue;
        }

        if (v < int.MinValue)
        {
            _logger?.LogWarning(
                "MySQL integer value below Int32.MinValue (field: {FieldName}, value: {Value}); clamping for migration.",
                fieldName,
                v);
            return int.MinValue;
        }

        return (int)v;
    }

    private int ReadMysqlIntAsInt32(MySqlDataReader reader, string columnName, string fieldName) =>
        ReadMysqlIntAsInt32(reader, reader.GetOrdinal(columnName), fieldName);

    private int? ReadMysqlIntAsInt32OrNull(MySqlDataReader reader, int ordinal, string fieldName) =>
        reader.IsDBNull(ordinal) ? null : ReadMysqlIntAsInt32(reader, ordinal, fieldName);

    private int? ReadMysqlIntAsInt32OrNull(MySqlDataReader reader, string columnName, string fieldName) =>
        ReadMysqlIntAsInt32OrNull(reader, reader.GetOrdinal(columnName), fieldName);
}

public class TableCheckResult
{
    public List<string> ExistingTables { get; set; } = new();
    public List<string> MissingTables { get; set; } = new();
    public bool AllTablesExist { get; set; }
}

