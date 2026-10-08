#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Heavy "lived-in" demo data for healthy showcase servers & webspaces:
 * real MariaDB databases/users, backup ghosts, schedules/tasks, subusers,
 * spell + custom env vars, import logs, extra allocations, API keys,
 * Ghost-ready Node webspace, mail host + mailboxes, webspace DBs/SFTP.
 *
 * Idempotent — safe on every bootstrap / golden rebuild.
 */

define('APP_PUBLIC', '/var/www/html');
define('ENV_PATH', APP_PUBLIC . '/storage/');
define('APP_DIR', APP_PUBLIC . '/');
define('IS_CLI', true);

require_once APP_DIR . '/boot/kernel.php';

use App\App;
use App\Chat\Allocation;
use App\Chat\ApiClient;
use App\Chat\Backup;
use App\Chat\BlockedEmailDomain;
use App\Chat\BlockedIp;
use App\Chat\CommandSnippet;
use App\Chat\DatabaseInstance;
use App\Chat\DnsHost;
use App\Chat\FeatherZeroTrustCronLog;
use App\Chat\FeatherZeroTrustScanLog;
use App\Chat\HostingPackage;
use App\Chat\Image;
use App\Chat\InstalledPlugin;
use App\Chat\LdapProvider;
use App\Chat\MailHost;
use App\Chat\MailTemplate;
use App\Chat\Node;
use App\Chat\OidcProvider;
use App\Chat\Proxy;
use App\Chat\Realm;
use App\Chat\RedirectLink;
use App\Chat\TimedTask;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\ServerCustomVariable;
use App\Chat\ServerDatabase;
use App\Chat\ServerImport;
use App\Chat\ServerSchedule;
use App\Chat\ServerVariable;
use App\Chat\Spell;
use App\Chat\SpellVariable;
use App\Chat\SubdomainDomain;
use App\Chat\Subuser;
use App\Chat\Task;
use App\Chat\User;
use App\Chat\UserSshKey;
use App\Chat\WebNode;
use App\Chat\WebPlate;
use App\Chat\WebSpace;
use App\Chat\WebSpaceBackup;
use App\Chat\WebSpaceDatabase;
use App\Chat\WebSpaceDomain;
use App\Chat\WebSpaceMailForwarder;
use App\Chat\WebSpaceMailingList;
use App\Chat\WebSpaceMailbox;
use App\Chat\WebSpaceSftpAccount;
use App\Chat\WebSpaceSubuser;
use App\Plugins\PluginDB;
use App\Plugins\PluginSettings;
use App\SubuserPermissions;

new App(false, false, true);

function bloat_log(string $message): void
{
    fwrite(STDOUT, '[demo-bloat] ' . $message . PHP_EOL);
}

function env_str(string $key, string $default): string
{
    $value = getenv($key);

    return ($value === false || trim((string) $value) === '') ? $default : trim((string) $value);
}

function env_int(string $key, int $default): int
{
    $value = getenv($key);

    return ($value === false || trim((string) $value) === '') ? $default : (int) $value;
}

function demo_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr(ord($bytes[6]) & 0x0F | 0x40);
    $bytes[8] = chr(ord($bytes[8]) & 0x3F | 0x80);
    $hex = bin2hex($bytes);

    return sprintf(
        '%s-%s-%s-%s-%s',
        substr($hex, 0, 8),
        substr($hex, 8, 4),
        substr($hex, 12, 4),
        substr($hex, 16, 4),
        substr($hex, 20, 12)
    );
}

/**
 * @return list<array<string, mixed>>
 */
function healthy_demo_servers(): array
{
    $names = ['Survival World', 'Creative Sandbox', 'Admin Test Node'];
    $out = [];
    foreach ($names as $name) {
        foreach (Server::searchServers(1, 50, $name) as $row) {
            if (($row['name'] ?? '') === $name) {
                $out[] = $row;
                break;
            }
        }
    }

    return $out;
}

function quote_mysql_ident(string $name): string
{
    return '`' . str_replace('`', '``', $name) . '`';
}

function quote_mysql_string(string $value): string
{
    return "'" . str_replace(["\\", "'"], ["\\\\", "\\'"], $value) . "'";
}

/**
 * Create a real MariaDB database + user on the demo host, then panel record.
 */
function ensure_real_server_database(array $server, array $host, string $suffix, string $password): void
{
    $serverId = (int) $server['id'];
    $dbName = 's' . $serverId . '_' . $suffix;
    $username = 'u' . $serverId . '_' . substr(md5($suffix . $serverId), 0, 10);

    if (ServerDatabase::getServerDatabaseByServerAndName($serverId, $dbName) !== null) {
        bloat_log("DB already exists: {$dbName}");

        return;
    }

    try {
        $dsn = sprintf(
            'mysql:host=%s;port=%d',
            $host['database_host'],
            (int) $host['database_port']
        );
        $pdo = new PDO($dsn, (string) $host['database_username'], (string) $host['database_password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 10,
        ]);

        $safeDb = quote_mysql_ident($dbName);
        $safeUser = quote_mysql_ident($username);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS {$safeDb} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec('CREATE USER IF NOT EXISTS ' . $safeUser . "@'%' IDENTIFIED BY " . quote_mysql_string($password));
        $pdo->exec("GRANT ALL PRIVILEGES ON {$safeDb}.* TO {$safeUser}@'%'");
        $pdo->exec('FLUSH PRIVILEGES');

        // Seed a tiny table so phpMyAdmin / credentials UI feel real.
        $pdo->exec("USE {$safeDb}");
        $pdo->exec('CREATE TABLE IF NOT EXISTS demo_meta (
            id INT AUTO_INCREMENT PRIMARY KEY,
            k VARCHAR(64) NOT NULL,
            v VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB');
        $stmt = $pdo->prepare('INSERT INTO demo_meta (k, v) VALUES (?, ?), (?, ?)');
        $stmt->execute(['server', (string) $server['name'], 'panel', 'FeatherPanel Demo']);
    } catch (Throwable $e) {
        bloat_log('WARNING: could not provision MariaDB ' . $dbName . ': ' . $e->getMessage());

        return;
    }

    $id = ServerDatabase::createServerDatabase([
        'server_id' => $serverId,
        'database_host_id' => (int) $host['id'],
        'database' => $dbName,
        'username' => $username,
        'password' => $password,
        'remote' => '%',
        'max_connections' => 25,
    ]);

    bloat_log($id ? "Created working DB {$dbName} (user {$username})" : "WARNING: panel record failed for {$dbName}");
}

function ensure_server_limits(array $server): void
{
    Server::updateServerById((int) $server['id'], [
        'database_limit' => 8,
        'backup_limit' => 10,
        'allocation_limit' => 6,
        'description' => trim((string) ($server['description'] ?? '')) !== ''
            ? (string) $server['description']
            : 'Demo server packed with databases, backups, schedules, subusers, and env vars',
    ]);
}

function ensure_extra_allocations(array $server): void
{
    $nodeId = (int) $server['node_id'];
    $serverId = (int) $server['id'];
    $assigned = Allocation::getByServerId($serverId);
    if (count($assigned) >= 2) {
        return;
    }

    $free = Allocation::getAvailable(2, 0, $nodeId);
    foreach (array_slice($free, 0, 2 - count($assigned)) as $alloc) {
        if (Allocation::assignToServer((int) $alloc['id'], $serverId)) {
            bloat_log('Assigned extra allocation ' . $alloc['ip'] . ':' . $alloc['port'] . ' → ' . $server['name']);
        }
    }

    // Create brand-new ports if the pool is empty.
    if (count(Allocation::getByServerId($serverId)) < 2) {
        $node = Node::getNodeById($nodeId);
        $ip = (string) ($node['fqdn'] ?? '127.0.0.1');
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            $ip = '0.0.0.0';
        }
        $base = env_int('DEMO_ALLOCATION_PORT_START', 25565) + 20 + $serverId;
        for ($p = $base; $p < $base + 5; ++$p) {
            if (!Allocation::isUniqueIpPort($nodeId, $ip, $p)) {
                continue;
            }
            $id = Allocation::create([
                'node_id' => $nodeId,
                'ip' => $ip,
                'port' => $p,
                'ip_alias' => 'demo-extra',
                'notes' => 'Secondary demo allocation',
            ]);
            if ($id && Allocation::assignToServer((int) $id, $serverId)) {
                bloat_log("Created+assigned allocation {$ip}:{$p} → {$server['name']}");
                break;
            }
        }
    }
}

function ensure_spell_and_server_variables(array $server, array $spell): void
{
    $spellId = (int) $spell['id'];
    $existing = SpellVariable::getVariablesBySpellId($spellId);
    $byEnv = [];
    foreach ($existing as $row) {
        $byEnv[strtoupper((string) ($row['env_variable'] ?? ''))] = $row;
    }

    $defs = [
        ['Server Name', 'SERVER_NAME', 'Display name used by the sleep demo process', 'FeatherDemo'],
        ['Max Players', 'MAX_PLAYERS', 'Soft player cap for UI demos', '20'],
        ['Game Mode', 'GAME_MODE', 'survival / creative / adventure', 'survival'],
        ['Difficulty', 'DIFFICULTY', 'peaceful / easy / normal / hard', 'easy'],
        ['MOTD', 'MOTD', 'Message of the day', 'Welcome to FeatherPanel Demo'],
        ['Enable Query', 'ENABLE_QUERY', 'true/false', 'true'],
        ['Seed', 'LEVEL_SEED', 'World seed string', 'featherpanel'],
        ['View Distance', 'VIEW_DISTANCE', 'Chunks', '10'],
    ];

    foreach ($defs as [$name, $env, $desc, $default]) {
        if (isset($byEnv[$env])) {
            continue;
        }
        $id = SpellVariable::createVariable([
            'spell_id' => $spellId,
            'name' => $name,
            'env_variable' => $env,
            'description' => $desc,
            'default_value' => $default,
            'user_viewable' => 1,
            'user_editable' => 1,
            'rules' => 'required|string|max:191',
            'field_type' => 'text',
        ]);
        if ($id) {
            $byEnv[$env] = SpellVariable::getVariableById((int) $id) ?? ['id' => $id, 'env_variable' => $env, 'default_value' => $default];
            bloat_log("Spell var {$env}");
        }
    }

    // Refresh map
    $byEnv = [];
    foreach (SpellVariable::getVariablesBySpellId($spellId) as $row) {
        $byEnv[strtoupper((string) ($row['env_variable'] ?? ''))] = $row;
    }

    $serverId = (int) $server['id'];
    $overrides = [
        'SERVER_NAME' => (string) $server['name'],
        'MAX_PLAYERS' => $server['name'] === 'Creative Sandbox' ? '50' : '20',
        'GAME_MODE' => str_contains(strtolower((string) $server['name']), 'creative') ? 'creative' : 'survival',
        'DIFFICULTY' => 'easy',
        'MOTD' => '§a' . $server['name'] . ' §7· FeatherPanel Demo',
        'ENABLE_QUERY' => 'true',
        'LEVEL_SEED' => 'demo-' . (string) $server['uuidShort'],
        'VIEW_DISTANCE' => '12',
    ];

    $payload = [];
    foreach ($overrides as $env => $value) {
        if (!isset($byEnv[$env]['id'])) {
            continue;
        }
        $payload[] = [
            'variable_id' => (int) $byEnv[$env]['id'],
            'variable_value' => $value,
        ];
    }
    if ($payload !== []) {
        ServerVariable::createOrUpdateServerVariables($serverId, $payload);
        bloat_log('Server variables synced for ' . $server['name']);
    }

    $ownerId = (int) $server['owner_id'];
    $customs = [
        ['Demo Flag', 'FP_DEMO', 'true', false],
        ['Wipe Policy', 'FP_WIPE_HOURS', '6', false],
        ['Support Tag', 'FP_SUPPORT_TAG', 'demo-public', false],
        ['Secret Token', 'FP_DEMO_SECRET', 'demo-not-for-production-' . substr((string) $server['uuid'], 0, 8), true],
        ['Java Opts', 'JAVA_TOOL_OPTIONS', '-Xms256M -Xmx512M', false],
        ['TZ', 'TZ', 'UTC', false],
    ];
    $existingCustom = ServerCustomVariable::getCustomVariablesByServerId($serverId);
    $have = [];
    foreach ($existingCustom as $row) {
        $have[strtoupper((string) ($row['env_variable'] ?? ''))] = true;
    }
    foreach ($customs as [$name, $env, $value, $enc]) {
        if (isset($have[$env])) {
            continue;
        }
        $ok = ServerCustomVariable::createCustomVariable([
            'server_id' => $serverId,
            'user_id' => $ownerId,
            'name' => $name,
            'env_variable' => $env,
            'variable_value' => $value,
            'is_encrypted' => $enc,
        ]);
        if ($ok) {
            bloat_log("Custom env {$env} on {$server['name']}");
        }
    }
}

function ensure_backups(array $server): void
{
    $serverId = (int) $server['id'];
    $existing = Backup::getBackupsByServerId($serverId);
    if (count($existing) >= 4) {
        return;
    }

    $specs = [
        ['Daily Auto — ' . date('Y-m-d', strtotime('-1 day')), true, true, 48_200_000, true],
        ['Pre-update snapshot', true, false, 51_800_000, false],
        ['Manual — configs only', true, false, 2_400_000, false],
        ['Failed / incomplete', false, false, 0, false],
        ['Locked archival', true, true, 120_000_000, true],
    ];

    $haveNames = array_column($existing, 'name');
    foreach ($specs as [$name, $ok, $locked, $bytes, $isLockedFlag]) {
        if (in_array($name, $haveNames, true)) {
            continue;
        }
        // Skip extras once we have enough
        if (count(Backup::getBackupsByServerId($serverId)) >= 5) {
            break;
        }
        $id = Backup::createBackup([
            'server_id' => $serverId,
            'uuid' => demo_uuid(),
            'name' => $name,
            'ignored_files' => "*.log\ncache/\n*.tmp",
            'disk' => 'wings',
            'is_successful' => $ok ? 1 : 0,
            'is_locked' => ($locked || $isLockedFlag) ? 1 : 0,
            'bytes' => $bytes,
            'checksum' => $ok ? 'sha1:' . sha1($name . $serverId) : null,
            'completed_at' => $ok ? date('Y-m-d H:i:s', time() - random_int(3600, 86400 * 5)) : null,
        ]);
        if ($id) {
            bloat_log("Backup ghost: {$name} → {$server['name']}");
        }
    }
}

function ensure_schedules(array $server): void
{
    $serverId = (int) $server['id'];
    $existing = ServerSchedule::getSchedulesByServerId($serverId);
    if (count($existing) >= 3) {
        return;
    }

    $defs = [
        [
            'name' => 'Nightly restart',
            'cron_day_of_week' => '*',
            'cron_month' => '*',
            'cron_day_of_month' => '*',
            'cron_hour' => '4',
            'cron_minute' => '0',
            'only_when_online' => 1,
            'tasks' => [
                ['action' => 'command', 'payload' => 'say FeatherPanel Demo: nightly restart in 60s', 'time_offset' => 0],
                ['action' => 'command', 'payload' => 'save-all', 'time_offset' => 30],
                ['action' => 'power', 'payload' => 'restart', 'time_offset' => 60],
            ],
        ],
        [
            'name' => 'Hourly backup',
            'cron_day_of_week' => '*',
            'cron_month' => '*',
            'cron_day_of_month' => '*',
            'cron_hour' => '*',
            'cron_minute' => '15',
            'only_when_online' => 1,
            'tasks' => [
                ['action' => 'backup', 'payload' => json_encode(['name' => 'Scheduled backup'], JSON_THROW_ON_ERROR), 'time_offset' => 0],
            ],
        ],
        [
            'name' => 'Weekend wipe reminder',
            'cron_day_of_week' => '0',
            'cron_month' => '*',
            'cron_day_of_month' => '*',
            'cron_hour' => '12',
            'cron_minute' => '0',
            'only_when_online' => 0,
            'tasks' => [
                ['action' => 'command', 'payload' => 'say Reminder: this is a public demo that wipes on a schedule.', 'time_offset' => 0],
            ],
        ],
    ];

    $have = array_column($existing, 'name');
    foreach ($defs as $def) {
        if (in_array($def['name'], $have, true)) {
            continue;
        }
        $next = ServerSchedule::calculateNextRunTime(
            $def['cron_day_of_week'],
            $def['cron_month'],
            $def['cron_day_of_month'],
            $def['cron_hour'],
            $def['cron_minute'],
        );
        $scheduleId = ServerSchedule::createSchedule([
            'server_id' => $serverId,
            'name' => $def['name'],
            'cron_day_of_week' => $def['cron_day_of_week'],
            'cron_month' => $def['cron_month'],
            'cron_day_of_month' => $def['cron_day_of_month'],
            'cron_hour' => $def['cron_hour'],
            'cron_minute' => $def['cron_minute'],
            'is_active' => 1,
            'is_processing' => 0,
            'only_when_online' => $def['only_when_online'],
            'next_run_at' => $next,
        ]);
        if (!$scheduleId) {
            bloat_log('WARNING: schedule failed: ' . $def['name']);
            continue;
        }
        $seq = 1;
        foreach ($def['tasks'] as $task) {
            Task::createTask([
                'schedule_id' => (int) $scheduleId,
                'sequence_id' => $seq++,
                'action' => $task['action'],
                'payload' => $task['payload'],
                'time_offset' => $task['time_offset'],
                'is_queued' => 0,
                'continue_on_failure' => 0,
            ]);
        }
        bloat_log("Schedule + tasks: {$def['name']} → {$server['name']}");
    }
}

function ensure_subusers(array $server): void
{
    $serverId = (int) $server['id'];
    $ownerId = (int) $server['owner_id'];
    $existing = Subuser::getSubusersByServerId($serverId);
    if (count($existing) >= 3) {
        return;
    }

    $permsFull = [
        SubuserPermissions::WEBSOCKET_CONNECT,
        SubuserPermissions::CONTROL_CONSOLE,
        SubuserPermissions::CONTROL_START,
        SubuserPermissions::CONTROL_STOP,
        SubuserPermissions::CONTROL_RESTART,
        SubuserPermissions::FILE_READ,
        SubuserPermissions::FILE_READ_CONTENT,
        SubuserPermissions::FILE_CREATE,
        SubuserPermissions::FILE_UPDATE,
        SubuserPermissions::FILE_DELETE,
        SubuserPermissions::FILE_ARCHIVE,
        SubuserPermissions::BACKUP_READ,
        SubuserPermissions::BACKUP_CREATE,
        SubuserPermissions::BACKUP_DOWNLOAD,
        SubuserPermissions::DATABASE_READ,
        SubuserPermissions::DATABASE_VIEW_PASSWORD,
        SubuserPermissions::SCHEDULE_READ,
        SubuserPermissions::SCHEDULE_CREATE,
        SubuserPermissions::ALLOCATION_READ,
        SubuserPermissions::STARTUP_READ,
    ];
    $permsReadonly = [
        SubuserPermissions::WEBSOCKET_CONNECT,
        SubuserPermissions::CONTROL_CONSOLE,
        SubuserPermissions::FILE_READ,
        SubuserPermissions::FILE_READ_CONTENT,
        SubuserPermissions::BACKUP_READ,
        SubuserPermissions::DATABASE_READ,
        SubuserPermissions::SCHEDULE_READ,
        SubuserPermissions::ALLOCATION_READ,
        SubuserPermissions::STARTUP_READ,
    ];

    $candidates = [];
    foreach (['support', 'moderator', 'player01', 'player02', 'player03'] as $username) {
        $u = User::getUserByUsername($username === 'support'
            ? env_str('DEMO_SUPPORT_USERNAME', 'support')
            : ($username === 'moderator' ? env_str('DEMO_MOD_USERNAME', 'moderator') : $username));
        if ($u !== null && (int) $u['id'] !== $ownerId) {
            $candidates[] = $u;
        }
    }

    $haveUsers = array_map(static fn ($r) => (int) ($r['user_id'] ?? 0), $existing);
    $i = 0;
    foreach ($candidates as $user) {
        if (in_array((int) $user['id'], $haveUsers, true)) {
            continue;
        }
        if (count(Subuser::getSubusersByServerId($serverId)) >= 4) {
            break;
        }
        $perms = $i === 0 ? $permsFull : $permsReadonly;
        $ok = Subuser::createSubuser([
            'user_id' => (int) $user['id'],
            'server_id' => $serverId,
            'permissions' => json_encode($perms, JSON_THROW_ON_ERROR),
        ]);
        if ($ok) {
            bloat_log("Subuser {$user['username']} on {$server['name']}");
        }
        ++$i;
    }
}

function ensure_imports(array $server): void
{
    $serverId = (int) $server['id'];
    $existing = ServerImport::getByServerId($serverId);
    if (count($existing) >= 3) {
        return;
    }

    $rows = [
        [
            'user' => 'root',
            'host' => 'legacy.pterodactyl.demo',
            'port' => 22,
            'source_location' => '/home/container',
            'destination_location' => '/',
            'type' => 'sftp',
            'wipe' => 0,
            'wipe_all_files' => 0,
            'status' => 'completed',
        ],
        [
            'user' => 'demo',
            'host' => 'old-panel.example',
            'port' => 2022,
            'source_location' => '/var/lib/pterodactyl/volumes/abc',
            'destination_location' => '/world',
            'type' => 'sftp',
            'wipe' => 1,
            'wipe_all_files' => 0,
            'status' => 'failed',
        ],
        [
            'user' => 'import',
            'host' => 'backup.featherpanel.local',
            'port' => 22,
            'source_location' => '/backups/survival.tar.gz',
            'destination_location' => '/',
            'type' => 'sftp',
            'wipe' => 0,
            'wipe_all_files' => 0,
            'status' => 'pending',
        ],
    ];

    foreach ($rows as $row) {
        $dup = false;
        foreach ($existing as $ex) {
            if (($ex['host'] ?? '') === $row['host'] && ($ex['status'] ?? '') === $row['status']) {
                $dup = true;
                break;
            }
        }
        if ($dup) {
            continue;
        }
        $row['server_id'] = $serverId;
        $id = ServerImport::create($row);
        if ($id) {
            bloat_log("Import log {$row['status']}: {$row['host']} → {$server['name']}");
        }
    }
}

function ensure_more_server_activity(array $server): void
{
    $serverId = (int) $server['id'];
    $existing = ServerActivity::getActivitiesByServerId($serverId, 50);
    $bloatCount = 0;
    foreach ($existing as $row) {
        $meta = $row['metadata'] ?? '';
        if (is_string($meta) && str_contains($meta, 'seed-bloat')) {
            ++$bloatCount;
        }
    }
    if ($bloatCount >= 8) {
        return;
    }

    $events = [
        'server:backup.complete',
        'server:database.created',
        'server:schedule.run',
        'server:subuser.added',
        'server:files.write',
        'server:import.completed',
        'server:allocation.created',
        'server:startup.updated',
    ];
    for ($i = $bloatCount; $i < 8; ++$i) {
        ServerActivity::createActivity([
            'server_id' => $serverId,
            'node_id' => (int) $server['node_id'],
            'user_id' => (int) $server['owner_id'],
            'ip' => '10.8.' . random_int(1, 20) . '.' . random_int(2, 250),
            'event' => $events[$i % count($events)],
            'metadata' => json_encode(['demo' => true, 'source' => 'seed-bloat', 'i' => $i], JSON_THROW_ON_ERROR),
        ]);
    }
    bloat_log('Activity events seeded for ' . $server['name']);
}

function ensure_api_clients(): void
{
    $demo = User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo'));
    $admin = User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin'));
    foreach ([$demo, $admin] as $user) {
        if ($user === null) {
            continue;
        }
        $existing = ApiClient::getApiClientsByUserUuid((string) $user['uuid']);
        if (count($existing) >= 2) {
            continue;
        }
        foreach (['Demo CI Token', 'Local Scripts'] as $name) {
            $dup = false;
            foreach ($existing as $ex) {
                if (($ex['name'] ?? '') === $name) {
                    $dup = true;
                    break;
                }
            }
            if ($dup) {
                continue;
            }
            $id = ApiClient::createApiClient([
                'user_uuid' => (string) $user['uuid'],
                'name' => $name,
                'description' => 'Demo API key — rotated on wipe. Not for production.',
                'public_key' => 'fp_' . bin2hex(random_bytes(16)),
                'private_key' => 'fp_' . bin2hex(random_bytes(32)),
                'allowed_ips' => '',
                'permissions' => json_encode(['*'], JSON_THROW_ON_ERROR),
            ]);
            if ($id) {
                bloat_log("API client '{$name}' for {$user['username']}");
            }
        }
    }
}

function ensure_more_allocations_pool(): void
{
    $nodes = Node::getAllNodes();
    $wings = null;
    foreach ($nodes as $n) {
        if (($n['name'] ?? '') === env_str('DEMO_WINGS_NODE_NAME', 'Demo Wings')) {
            $wings = $n;
            break;
        }
    }
    if ($wings === null && $nodes !== []) {
        $wings = $nodes[0];
    }
    if ($wings === null) {
        return;
    }

    $nodeId = (int) $wings['id'];
    $start = env_int('DEMO_ALLOCATION_PORT_START', 25565) + 40;
    $created = 0;
    for ($port = $start; $port < $start + 15; ++$port) {
        if (!Allocation::isUniqueIpPort($nodeId, '0.0.0.0', $port)) {
            continue;
        }
        $id = Allocation::create([
            'node_id' => $nodeId,
            'ip' => '0.0.0.0',
            'port' => $port,
            'ip_alias' => 'demo-pool',
            'notes' => 'Unassigned demo pool allocation',
        ]);
        if ($id) {
            ++$created;
        }
    }
    if ($created > 0) {
        bloat_log("Added {$created} free allocations to pool");
    }
}

function ensure_ghost_and_web_bloat(): void
{
    WebPlate::seedSystemDefaults();
    $plates = WebPlate::listAll(1, 100, 'node');
    $nodePlate = $plates[0] ?? null;
    if ($nodePlate === null) {
        $all = WebPlate::listAll(1, 100, null);
        foreach ($all as $p) {
            if (($p['runtime'] ?? '') === 'node') {
                $nodePlate = $p;
                break;
            }
        }
    }

    $webNodes = WebNode::getAllWebNodes();
    $webNode = $webNodes[0] ?? null;
    $demo = User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo'));
    $admin = User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin'));

    if ($webNode !== null && $nodePlate !== null && $demo !== null) {
        $ghostName = 'Ghost CMS Blog';
        $exists = false;
        foreach (WebSpace::listAll(1, 50, $ghostName) as $ws) {
            if (($ws['name'] ?? '') === $ghostName) {
                $exists = true;
                $ghost = $ws;
                break;
            }
        }
        if (!$exists) {
            $id = WebSpace::create([
                'name' => $ghostName,
                'web_node_id' => (int) $webNode['id'],
                'webplate_id' => (int) $nodePlate['id'],
                'owner_id' => (int) $demo['id'],
                'disk' => 5120,
                'cpu_limit' => 100,
                'memory_limit' => 1024,
                'bandwidth_limit_gb' => 100,
                'database_limit' => 3,
                'mailbox_limit' => 5,
                'ssl' => 1,
                'status' => 'active',
                'state' => 'stopped',
                'domains' => json_encode([
                    ['domain' => 'ghost.demo.featherpanel.local', 'type' => 'primary'],
                    ['domain' => 'blog.demo.featherpanel.local', 'type' => 'alias'],
                ], JSON_THROW_ON_ERROR),
            ]);
            $ghost = $id ? WebSpace::getById((int) $id) : null;
            bloat_log($ghost ? 'Created Ghost-ready Node webspace' : 'WARNING: Ghost webspace create failed');
        }

        if (!empty($ghost['id'])) {
            try {
                WebSpaceDomain::replaceForWebspace((int) $ghost['id'], [
                    ['domain' => 'ghost.demo.featherpanel.local', 'type' => 'primary', 'document_root' => '/'],
                    ['domain' => 'blog.demo.featherpanel.local', 'type' => 'alias', 'document_root' => '/'],
                ]);
            } catch (Throwable $e) {
                bloat_log('WARNING: ghost domains: ' . $e->getMessage());
            }

            // Webspace databases (panel records + real MariaDB when host available)
            $dbHost = null;
            foreach (DatabaseInstance::getAllDatabases() as $row) {
                if (($row['name'] ?? '') === 'Demo MariaDB') {
                    $dbHost = DatabaseInstance::getDatabaseById((int) $row['id']);
                    break;
                }
            }
            if ($dbHost !== null) {
                $wsDbName = 'ws' . (int) $ghost['id'] . '_ghost';
                $wsUser = 'wsu' . (int) $ghost['id'] . '_ghost';
                $wsPass = 'GhostDemoPass!' . (int) $ghost['id'];
                $already = false;
                foreach (WebSpaceDatabase::listByWebSpaceId((int) $ghost['id']) as $row) {
                    if (($row['database'] ?? '') === $wsDbName) {
                        $already = true;
                        break;
                    }
                }
                if (!$already) {
                    try {
                        $dsn = sprintf('mysql:host=%s;port=%d', $dbHost['database_host'], (int) $dbHost['database_port']);
                        $pdo = new PDO($dsn, (string) $dbHost['database_username'], (string) $dbHost['database_password'], [
                            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        ]);
                        $safeDb = quote_mysql_ident($wsDbName);
                        $safeUser = quote_mysql_ident($wsUser);
                        $pdo->exec("CREATE DATABASE IF NOT EXISTS {$safeDb} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                        $pdo->exec('CREATE USER IF NOT EXISTS ' . $safeUser . "@'%' IDENTIFIED BY " . quote_mysql_string($wsPass));
                        $pdo->exec("GRANT ALL PRIVILEGES ON {$safeDb}.* TO {$safeUser}@'%'");
                        $pdo->exec('FLUSH PRIVILEGES');
                        WebSpaceDatabase::create([
                            'webspace_id' => (int) $ghost['id'],
                            'database_host_id' => (int) $dbHost['id'],
                            'database' => $wsDbName,
                            'username' => $wsUser,
                            'password' => $wsPass,
                        ]);
                        bloat_log("Ghost webspace DB {$wsDbName}");
                    } catch (Throwable $e) {
                        bloat_log('WARNING: ghost DB: ' . $e->getMessage());
                    }
                }
            }

            $sftpExisting = WebSpaceSftpAccount::listByWebSpaceId((int) $ghost['id']);
            if ($sftpExisting === []) {
                WebSpaceSftpAccount::create([
                    'webspace_id' => (int) $ghost['id'],
                    'account_name' => 'ghost',
                    'password' => env_str('DEMO_USER_PASSWORD', 'demoPassword'),
                    'home_relative' => '/',
                    'enabled' => 1,
                ]);
                bloat_log('Ghost SFTP account');
            }

            $wsBackups = WebSpaceBackup::listByWebSpaceId((int) $ghost['id']);
            if (count($wsBackups) < 2) {
                WebSpaceBackup::create([
                    'webspace_id' => (int) $ghost['id'],
                    'uuid' => demo_uuid(),
                    'name' => 'Ghost content snapshot',
                    'bytes' => 15_000_000,
                    'checksum' => 'sha1:' . sha1('ghost-backup'),
                    'status' => 'completed',
                ]);
                WebSpaceBackup::create([
                    'webspace_id' => (int) $ghost['id'],
                    'uuid' => demo_uuid(),
                    'name' => 'Pre-theme-change',
                    'bytes' => 14_200_000,
                    'status' => 'completed',
                ]);
                bloat_log('Ghost webspace backups');
            }

            if ($admin !== null) {
                $subs = WebSpaceSubuser::listByWebSpaceId((int) $ghost['id']);
                if ($subs === []) {
                    WebSpaceSubuser::create([
                        'user_id' => (int) $admin['id'],
                        'webspace_id' => (int) $ghost['id'],
                        'permissions' => [
                            'file.read',
                            'file.read-content',
                            'file.create',
                            'file.update',
                            'database.read',
                            'database.view_password',
                            'settings.read',
                            'backup.read',
                            'mail.read',
                        ],
                    ]);
                    bloat_log('Ghost webspace subuser (admin)');
                }
            }
        }
    }

    // Mail host + mailboxes on portfolio / php webspaces
    $mailHost = null;
    foreach (MailHost::listAll() as $row) {
        if (($row['name'] ?? '') === 'Demo Mail') {
            $mailHost = $row;
            break;
        }
    }
    if ($mailHost === null) {
        $id = MailHost::create([
            'name' => 'Demo Mail',
            'hostname' => 'mail.demo.featherpanel.local',
            'imap_host' => 'mail.demo.featherpanel.local',
            'imap_port' => 993,
            'smtp_host' => 'mail.demo.featherpanel.local',
            'smtp_port' => 587,
            'description' => 'Fake mail host for demo UI — not a real MTA',
        ]);
        $mailHost = $id ? MailHost::getById((int) $id) : null;
        bloat_log($mailHost ? 'Created Demo Mail host' : 'WARNING: mail host create failed');
    }

    if ($webNode !== null) {
        $dbHostForWs = null;
        foreach (DatabaseInstance::getAllDatabases() as $row) {
            if (($row['name'] ?? '') === 'Demo MariaDB') {
                $dbHostForWs = DatabaseInstance::getDatabaseById((int) $row['id']);
                break;
            }
        }

        foreach (WebSpace::listAll(1, 50, null, (int) $webNode['id']) as $ws) {
            if ((int) ($ws['mailbox_limit'] ?? 0) < 1 || (int) ($ws['database_limit'] ?? 0) < 2) {
                WebSpace::update((string) $ws['uuid'], [
                    'mailbox_limit' => max(5, (int) ($ws['mailbox_limit'] ?? 0)),
                    'database_limit' => max(3, (int) ($ws['database_limit'] ?? 0)),
                ]);
            }

            if ($mailHost !== null && WebSpaceMailbox::listByWebSpaceId((int) $ws['id']) === []) {
                $local = strtolower(preg_replace('/[^a-z0-9]+/', '', (string) $ws['name']) ?: 'site');
                WebSpaceMailbox::create([
                    'webspace_id' => (int) $ws['id'],
                    'mail_host_id' => (int) $mailHost['id'],
                    'local_part' => substr($local, 0, 20) ?: 'info',
                    'domain' => 'demo.featherpanel.local',
                    'password' => env_str('DEMO_USER_PASSWORD', 'demoPassword'),
                    'quota_mb' => 1024,
                    'enabled' => 1,
                ]);
                bloat_log('Mailbox on webspace ' . $ws['name']);
            }

            if (WebSpaceSftpAccount::listByWebSpaceId((int) $ws['id']) === []) {
                $acct = strtolower(preg_replace('/[^a-z0-9]+/', '', (string) $ws['name']) ?: 'web');
                WebSpaceSftpAccount::create([
                    'webspace_id' => (int) $ws['id'],
                    'account_name' => substr($acct, 0, 16) ?: 'web',
                    'password' => env_str('DEMO_USER_PASSWORD', 'demoPassword'),
                    'home_relative' => '/',
                    'enabled' => 1,
                ]);
                bloat_log('SFTP on webspace ' . $ws['name']);
            }

            if (count(WebSpaceBackup::listByWebSpaceId((int) $ws['id'])) < 1) {
                WebSpaceBackup::create([
                    'webspace_id' => (int) $ws['id'],
                    'uuid' => demo_uuid(),
                    'name' => 'Weekly auto — ' . date('Y-m-d', strtotime('-3 days')),
                    'bytes' => random_int(2_000_000, 40_000_000),
                    'checksum' => 'sha1:' . sha1((string) $ws['uuid']),
                    'status' => 'completed',
                ]);
                bloat_log('Backup ghost on webspace ' . $ws['name']);
            }

            if ($dbHostForWs !== null && WebSpaceDatabase::listByWebSpaceId((int) $ws['id']) === []) {
                $wsId = (int) $ws['id'];
                $dbName = 'ws' . $wsId . '_app';
                $dbUser = 'wsu' . $wsId . '_app';
                $dbPass = 'WsDemoPass!' . $wsId;
                try {
                    $dsn = sprintf('mysql:host=%s;port=%d', $dbHostForWs['database_host'], (int) $dbHostForWs['database_port']);
                    $pdo = new PDO($dsn, (string) $dbHostForWs['database_username'], (string) $dbHostForWs['database_password'], [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    ]);
                    $safeDb = quote_mysql_ident($dbName);
                    $safeUser = quote_mysql_ident($dbUser);
                    $pdo->exec("CREATE DATABASE IF NOT EXISTS {$safeDb} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    $pdo->exec('CREATE USER IF NOT EXISTS ' . $safeUser . "@'%' IDENTIFIED BY " . quote_mysql_string($dbPass));
                    $pdo->exec("GRANT ALL PRIVILEGES ON {$safeDb}.* TO {$safeUser}@'%'");
                    $pdo->exec('FLUSH PRIVILEGES');
                    WebSpaceDatabase::create([
                        'webspace_id' => $wsId,
                        'database_host_id' => (int) $dbHostForWs['id'],
                        'database' => $dbName,
                        'username' => $dbUser,
                        'password' => $dbPass,
                    ]);
                    bloat_log("Webspace DB {$dbName} on {$ws['name']}");
                } catch (Throwable $e) {
                    bloat_log('WARNING: webspace DB ' . $ws['name'] . ': ' . $e->getMessage());
                }
            }
        }
    }
}

function ensure_blocked_ips(): void
{
    if (BlockedIp::countSearch('', false) >= 14) {
        bloat_log('Blocked IPs already seeded');

        return;
    }

    $admin = User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin'));
    $adminUuid = isset($admin['uuid']) ? (string) $admin['uuid'] : null;

    $rows = [
        ['185.220.101.1', 'Tor exit / abuse reports', null],
        ['45.33.32.0/24', 'Known scanner netblock', null],
        ['203.0.113.50', 'Brute-force SSH against Wings', date('Y-m-d H:i:s', time() + 86400 * 14)],
        ['198.51.100.77', 'Credential stuffing on login', date('Y-m-d H:i:s', time() + 86400 * 7)],
        ['104.244.42.0/24', 'Spam registration attempts', null],
        ['192.0.2.222', 'Demo sample permanent block', null],
        ['10.255.255.200', 'Internal red-team honeypot hit', date('Y-m-d H:i:s', time() + 3600 * 12)],
        ['172.16.99.1', 'Rate-limit evasion', null],
        ['8.8.8.8', 'FALSE POSITIVE example (expired)', date('Y-m-d H:i:s', time() - 3600)],
        ['91.203.5.0/24', 'Bulletproof hosting ASN sample', null],
        ['5.188.206.0/24', 'Known botnet C2 range (demo)', null],
        ['193.32.162.88', 'Ticket spam bot', date('Y-m-d H:i:s', time() + 86400 * 3)],
        ['2001:db8::1', 'IPv6 demo block', null],
        ['100.64.0.50', 'CGNAT abuser sample', null],
    ];

    $n = 0;
    foreach ($rows as [$ip, $reason, $expires]) {
        $normalized = BlockedIp::normalizeIpInput($ip);
        if ($normalized === null) {
            continue;
        }
        if (BlockedIp::create($normalized, $reason, $expires, $adminUuid)) {
            ++$n;
        }
    }
    bloat_log("Blocked IPs seeded: {$n}");
}

function ensure_blocked_email_domains(): void
{
    if (BlockedEmailDomain::countSearch('') >= 20) {
        bloat_log('Blocked email domains already seeded');

        return;
    }

    $domains = [
        'mailinator.com',
        'guerrillamail.com',
        'tempmail.com',
        '10minutemail.com',
        'yopmail.com',
        'trashmail.com',
        'throwaway.email',
        'sharklasers.com',
        'getnada.com',
        'dispostable.com',
        'fakeinbox.com',
        'spam4.me',
        'demo-abuse.invalid',
        'banned-signup.example',
        'temp-mail.org',
        'emailondeck.com',
        'maildrop.cc',
        'discard.email',
        'mailnesia.com',
        'guerrillamailblock.com',
        'mintemail.com',
        'spamgourmet.com',
    ];

    $n = 0;
    foreach ($domains as $domain) {
        $normalized = BlockedEmailDomain::normalizeDomainInput($domain);
        if ($normalized === null) {
            continue;
        }
        if (BlockedEmailDomain::create($normalized, 'manual')) {
            ++$n;
        }
    }
    bloat_log("Blocked email domains seeded: {$n}");
}

function ensure_ssh_keys(): void
{
    $users = array_filter([
        User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo')),
        User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin')),
        User::getUserByUsername(env_str('DEMO_SUPPORT_USERNAME', 'support')),
    ]);

    $keys = [
        [
            'name' => 'Demo laptop',
            'public_key' => 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAjXbYA431GymrYyFyAAKCfvDZ1Zxb6T5GROie0c1HmA demo@featherpanel',
        ],
        [
            'name' => 'CI deploy key',
            'public_key' => 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIInE5PRXzJWbD7vYbaz0rE8V92RwPXIZjgIExNi6XUjD laptop@featherpanel',
        ],
        [
            'name' => 'Workstation RSA',
            'public_key' => 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDRB9EPxIZU7dF2urWypEyvsWdpb/WVp9wb99CWV+/OWePCa9VTC2rXSaOxkleO6vSlhdxGhrZZQPl4kp5RDL2y7iUYvHzgm9b/Yr66FCDdDCJC0u2Z41hTQfAyABZs8krEilDPH3wUyfJDdVAcYnMhPuzZ9QlwHyD48JdHCjzIm/OhyWsP+3OhV0ajZJGVrDJsZ4Unq4oanpCmZwBP61ebTiaDp5qmf5yfvEkL9wzoTNebQvV/2oe7V9lqQQ46NpJdpUYMZviHWcVKPo2+PO6yWDdWcKRrEJjZYb9cKkS7Sd1IMod3VvIcbOBT0UpgZy96fZjZ0lrlYFeCABP3cJbD ci@featherpanel',
        ],
    ];

    foreach ($users as $user) {
        $existing = UserSshKey::getUserSshKeysByUserId((int) $user['id']);
        if (count($existing) >= 2) {
            continue;
        }
        $have = array_column($existing, 'name');
        foreach ($keys as $key) {
            if (in_array($key['name'], $have, true)) {
                continue;
            }
            $id = UserSshKey::createUserSshKey([
                'user_id' => (int) $user['id'],
                'name' => $key['name'],
                'public_key' => $key['public_key'],
            ]);
            if ($id) {
                bloat_log("SSH key '{$key['name']}' → {$user['username']}");
            }
        }
    }
}

function ensure_mail_lists_and_forwarders(): void
{
    $mailHost = null;
    foreach (MailHost::listAll() as $row) {
        if (($row['name'] ?? '') === 'Demo Mail') {
            $mailHost = $row;
            break;
        }
    }
    if ($mailHost === null) {
        return;
    }

    foreach (WebSpace::listAll(1, 50, null) as $ws) {
        $wsId = (int) $ws['id'];
        $lists = WebSpaceMailingList::listByWebSpaceId($wsId);
        if ($lists === []) {
            $slug = strtolower(preg_replace('/[^a-z0-9]+/', '', (string) $ws['name']) ?: 'site');
            foreach (['news', 'updates'] as $listLocal) {
                foreach (['alice@example.com', 'bob@demo.featherpanel.local', 'moderator@demo.demo'] as $member) {
                    WebSpaceMailingList::create([
                        'webspace_id' => $wsId,
                        'mail_host_id' => (int) $mailHost['id'],
                        'list_local' => $listLocal . '-' . substr($slug, 0, 8),
                        'domain' => 'demo.featherpanel.local',
                        'member' => $member,
                        'enabled' => 1,
                    ]);
                }
            }
            bloat_log('Mailing lists on ' . $ws['name']);
        }

        $fwds = WebSpaceMailForwarder::listByWebSpaceId($wsId);
        if ($fwds === []) {
            WebSpaceMailForwarder::create([
                'webspace_id' => $wsId,
                'mail_host_id' => (int) $mailHost['id'],
                'source_local' => 'contact',
                'domain' => 'demo.featherpanel.local',
                'destination' => 'demo@demo.demo',
                'enabled' => 1,
            ]);
            WebSpaceMailForwarder::create([
                'webspace_id' => $wsId,
                'mail_host_id' => (int) $mailHost['id'],
                'source_local' => 'abuse',
                'domain' => 'demo.featherpanel.local',
                'destination' => 'admin@demo.demo',
                'enabled' => 1,
            ]);
            bloat_log('Mail forwarders on ' . $ws['name']);
        }
    }
}

function ensure_zero_trust_logs(array $servers): void
{
    if (FeatherZeroTrustCronLog::getCount() >= 3) {
        bloat_log('Zero Trust logs already seeded');

        return;
    }

    $executions = [
        [
            'status' => 'completed',
            'detections' => 0,
            'errors' => 0,
            'summary' => 'Clean scan — no malware signatures matched',
        ],
        [
            'status' => 'completed',
            'detections' => 2,
            'errors' => 0,
            'summary' => 'Demo detection samples (harmless placeholders)',
        ],
        [
            'status' => 'failed',
            'detections' => 0,
            'errors' => 1,
            'summary' => 'Node timeout during deep scan (demo)',
        ],
    ];

    foreach ($executions as $i => $spec) {
        $execId = 'fzt-demo-' . ($i + 1) . '-' . substr(md5((string) $i), 0, 8);
        FeatherZeroTrustCronLog::create([
            'execution_id' => $execId,
            'started_at' => date('Y-m-d H:i:s', time() - (86400 * ($i + 1))),
            'status' => $spec['status'],
            'total_servers_scanned' => count($servers),
            'total_detections' => $spec['detections'],
            'total_errors' => $spec['errors'],
            'summary' => $spec['summary'],
            'details' => ['demo' => true, 'source' => 'seed-bloat'],
        ]);

        foreach ($servers as $j => $server) {
            $detCount = ($i === 1 && $j === 0) ? 2 : 0;
            FeatherZeroTrustScanLog::create([
                'execution_id' => $execId,
                'server_uuid' => (string) $server['uuid'],
                'server_name' => (string) $server['name'],
                'node_id' => (int) $server['node_id'],
                'node_name' => 'Demo Wings',
                'status' => $spec['status'] === 'failed' && $j === 0 ? 'error' : 'completed',
                'files_scanned' => random_int(1200, 8900),
                'detections_count' => $detCount,
                'errors_count' => ($spec['status'] === 'failed' && $j === 0) ? 1 : 0,
                'duration_seconds' => random_int(8, 90),
                'detections' => $detCount > 0 ? [
                    ['path' => '/plugins/SuspiciousDemo.jar.txt', 'type' => 'malware', 'signature' => 'DEMO.Fake.Sig'],
                    ['path' => '/mods/DemoMiner.class.txt', 'type' => 'pua', 'signature' => 'DEMO.PUA.Miner'],
                ] : [],
                'error_message' => ($spec['status'] === 'failed' && $j === 0) ? 'Demo timeout contacting Wings' : null,
            ]);
        }
        bloat_log("Zero Trust cron+scan: {$execId}");
    }
}

function ensure_installed_plugins(?array $spell = null): void
{
    $plugins = [
        [
            'name' => 'Demo Showcase',
            'identifier' => 'demoshowcase',
            'version' => '1.1.0',
            'uninstalled' => false,
        ],
        [
            'name' => 'Demo Welcome',
            'identifier' => 'demowelcome',
            'version' => '1.0.0',
            'uninstalled' => false,
        ],
        [
            'name' => 'Demo Status',
            'identifier' => 'demostatus',
            'version' => '1.0.0',
            'uninstalled' => false,
        ],
        [
            'name' => 'Demo Tools',
            'identifier' => 'demotools',
            'version' => '1.0.1',
            'uninstalled' => false,
        ],
        [
            'name' => 'Legacy Demo Widget',
            'identifier' => 'demolegacywidget',
            'version' => '0.9.0',
            'uninstalled' => true,
        ],
    ];

    $register = [
        'demoshowcase' => 'Demo Showcase',
        'demowelcome' => 'Demo Welcome',
        'demostatus' => 'Demo Status',
        'demotools' => 'Demo Tools',
    ];

    foreach ($register as $ident => $display) {
        try {
            if (!PluginDB::isPluginRegistered($ident)) {
                PluginDB::registerPlugin($ident, $display);
            }
            PluginDB::setPluginEnabled($ident, true);
        } catch (Throwable $e) {
            bloat_log('WARNING: PluginDB register ' . $ident . ': ' . $e->getMessage());
        }
    }

    foreach ($plugins as $p) {
        $existing = InstalledPlugin::getInstalledPluginByIdentifier($p['identifier']);
        if ($existing !== null) {
            if ($p['uninstalled'] && empty($existing['uninstalled_at'])) {
                InstalledPlugin::markAsUninstalled($p['identifier']);
            }
            continue;
        }
        $id = InstalledPlugin::createInstalledPlugin([
            'name' => $p['name'],
            'identifier' => $p['identifier'],
            'version' => $p['version'],
            'installed_at' => date('Y-m-d H:i:s', time() - random_int(86400, 86400 * 30)),
        ]);
        if ($id && $p['uninstalled']) {
            InstalledPlugin::markAsUninstalled($p['identifier']);
        }
        if ($id) {
            bloat_log("InstalledPlugin record: {$p['identifier']}" . ($p['uninstalled'] ? ' (uninstalled)' : ''));
        }
    }

    // DemoShowcase: defaults + limit server sidebar to the demo sleep spell only.
    try {
        PluginSettings::setSetting('demoshowcase', 'hide_dashboard_banner', 'false');
        PluginSettings::setSetting('demoshowcase', 'hide_admin_card', 'false');
        PluginSettings::setSetting('demoshowcase', 'hide_server_console_card', 'false');
        PluginSettings::setSetting(
            'demoshowcase',
            'tip_text',
            'This widget comes from the DemoShowcase addon. Toggle visibility under Admin → Plugins → DemoShowcase.'
        );

        $spellIds = [];
        if ($spell !== null && isset($spell['id'])) {
            $spellIds[] = (int) $spell['id'];
        }
        // Also allow any spell that shares the demo sleep name across realms.
        foreach (Spell::getAllSpells() as $s) {
            if (($s['name'] ?? '') === env_str('DEMO_SPELL_NAME', 'Demo Sleep Server')) {
                $spellIds[] = (int) $s['id'];
            }
        }
        $spellIds = array_values(array_unique(array_filter($spellIds)));
        PluginSettings::setSetting(
            'demoshowcase',
            'plugin-sidebar-server-allowedOnlyOnSpells',
            json_encode($spellIds, JSON_THROW_ON_ERROR)
        );
        bloat_log('DemoShowcase spell allow-list: [' . implode(',', $spellIds) . ']');
    } catch (Throwable $e) {
        bloat_log('WARNING: DemoShowcase settings: ' . $e->getMessage());
    }
}

function ensure_redirect_links(): void
{
    $links = [
        ['Demo Docs', 'docs', 'https://featherpanel.com/docs'],
        ['Discord', 'discord', 'https://discord.gg/featherpanel'],
        ['Status', 'status', '/status'],
        ['Knowledgebase', 'kb', '/knowledgebase'],
        ['GitHub', 'github', 'https://github.com/mythicalltd/featherpanel'],
        ['Billing FAQ', 'billing', '/knowledgebase'],
        ['Support', 'support', '/tickets'],
        ['API', 'api', 'https://featherpanel.com/docs/api'],
        ['Changelog', 'changelog', 'https://featherpanel.com/changelog'],
        ['Careers', 'jobs', 'https://mythical.systems'],
    ];
    $now = date('Y-m-d H:i:s');
    foreach ($links as [$name, $slug, $url]) {
        if (RedirectLink::getBySlug($slug) !== null) {
            continue;
        }
        $id = RedirectLink::create([
            'name' => $name,
            'slug' => $slug,
            'url' => $url,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        if ($id) {
            bloat_log("Redirect link /r/{$slug}");
        }
    }
}

function ensure_command_snippets(): void
{
    $demo = User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo'));
    $admin = User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin'));
    if ($demo === null) {
        return;
    }

    $snippets = [
        [$demo, 'Say hello', 'say Hello from FeatherPanel Demo!'],
        [$demo, 'Save world', 'save-all'],
        [$demo, 'List players', 'list'],
        [$admin ?? $demo, 'Reload demo', 'say Reloading demo configs…'],
        [$admin ?? $demo, 'Broadcast wipe', 'say Reminder: this demo wipes on a schedule.'],
    ];

    foreach ($snippets as [$user, $name, $command]) {
        $listed = CommandSnippet::listByUserUuid((string) $user['uuid'], 1, 50);
        $existing = $listed['data'] ?? [];
        $have = false;
        foreach ($existing as $row) {
            if (($row['name'] ?? '') === $name) {
                $have = true;
                break;
            }
        }
        if ($have) {
            continue;
        }
        $id = CommandSnippet::create([
            'uuid' => demo_uuid(),
            'user_uuid' => (string) $user['uuid'],
            'name' => $name,
            'command' => $command,
            'eggs' => [],
        ]);
        if ($id) {
            bloat_log("Command snippet '{$name}' → {$user['username']}");
        }
    }
}

function ensure_demo_proxies(array $servers): void
{
    foreach ($servers as $server) {
        $existing = Proxy::getByServerId((int) $server['id']);
        if ($existing !== []) {
            continue;
        }
        $slug = strtolower(preg_replace('/[^a-z0-9]+/', '-', (string) $server['name']) ?: 'demo');
        $id = Proxy::create([
            'server_id' => (int) $server['id'],
            'domain' => $slug . '.proxy.demo.featherpanel.local',
            'ip' => '0.0.0.0',
            'port' => 25565,
            'ssl' => 0,
            'use_lets_encrypt' => 0,
        ]);
        if ($id) {
            bloat_log("Proxy domain for {$server['name']}");
        }
    }
}

function ensure_subdomain_domains(): void
{
    foreach (SubdomainDomain::getDomains(1, 50) as $row) {
        if (($row['domain'] ?? '') === 'demo.featherpanel.local') {
            bloat_log('Subdomain domain already seeded');

            return;
        }
    }

    $id = SubdomainDomain::createDomain(
        [
            'domain' => 'demo.featherpanel.local',
            'description' => 'Demo subdomain zone (fake Cloudflare IDs for UI)',
            'is_active' => 1,
            'cloudflare_zone_id' => 'demo-zone-not-real',
            'cloudflare_account_id' => 'demo-cf-account-not-real',
        ],
        [],
    );
    bloat_log($id ? 'Subdomain domain demo.featherpanel.local' : 'WARNING: subdomain domain create failed');
}

function ensure_mail_templates(): void
{
    $templates = [
        [
            'name' => 'demo_welcome',
            'subject' => 'Welcome to FeatherPanel Demo',
            'body' => "<p>Hi {{username}},</p><p>Welcome to the public FeatherPanel demo. This environment wipes on a schedule.</p><p>- The FeatherPanel Team</p>",
        ],
        [
            'name' => 'demo_server_ready',
            'subject' => 'Your demo server is ready',
            'body' => '<p>Server <strong>{{server_name}}</strong> finished installing. Open the panel to explore console, files, and schedules.</p>',
        ],
        [
            'name' => 'demo_ticket_reply',
            'subject' => 'New reply on your ticket',
            'body' => '<p>Support replied to ticket #{{ticket_id}}.</p><p>{{message}}</p>',
        ],
        [
            'name' => 'demo_wipe_notice',
            'subject' => 'Demo wipe reminder',
            'body' => '<p>This demo panel resets periodically. Anything you create may disappear.</p>',
        ],
    ];

    foreach ($templates as $tpl) {
        if (MailTemplate::getByName($tpl['name']) !== null) {
            continue;
        }
        if (MailTemplate::create($tpl)) {
            bloat_log('Mail template ' . $tpl['name']);
        }
    }
}

function ensure_demo_images(): void
{
    $images = [
        ['Demo Logo', 'https://cdn.mythical.systems/featherpanel/logo.png'],
        ['Demo Banner', 'https://cdn.mythical.systems/featherpanel/logo.png'],
        ['Spell Placeholder', 'https://cdn.mythical.systems/featherpanel/logo.png'],
        ['Node Icon', 'https://cdn.mythical.systems/featherpanel/logo.png'],
        ['Webspace Hero', 'https://cdn.mythical.systems/featherpanel/logo.png'],
    ];
    foreach ($images as [$name, $url]) {
        if (Image::getByName($name) !== null) {
            continue;
        }
        if (Image::create(['name' => $name, 'url' => $url])) {
            bloat_log("Image library: {$name}");
        }
    }
}

function ensure_timed_tasks(): void
{
    $tasks = [
        ['demo_seed_heartbeat', true, 'Demo seed heartbeat OK'],
        ['demo_backup_ghost_sync', true, 'Ghosted backup metadata refreshed'],
        ['demo_zt_scan_tick', true, 'Zero Trust demo scan tick'],
        ['demo_mail_queue_noop', false, 'Mail queue dry-run (SMTP disabled)'],
        ['demo_kpi_rollup', true, 'KPI counters rolled up for charts'],
    ];
    foreach ($tasks as [$name, $ok, $msg]) {
        if (TimedTask::getByName($name) !== null) {
            continue;
        }
        if (
            TimedTask::create([
                'task_name' => $name,
                'last_run_at' => date('Y-m-d H:i:s', time() - random_int(60, 86400)),
                'last_run_success' => $ok ? 1 : 0,
                'last_run_message' => $msg,
            ])
        ) {
            bloat_log("Timed task {$name}");
        }
    }
}

function ensure_dns_host(): void
{
    foreach (DnsHost::listAll() as $row) {
        if (($row['name'] ?? '') === 'Demo DNS') {
            return;
        }
    }
    $webNodes = WebNode::getAllWebNodes();
    $webNodeId = isset($webNodes[0]['id']) ? (int) $webNodes[0]['id'] : null;
    $id = DnsHost::create([
        'name' => 'Demo DNS',
        'provider' => 'node',
        'web_node_id' => $webNodeId,
    ]);
    bloat_log($id ? 'DNS host Demo DNS' : 'WARNING: DNS host create failed');
}

function ensure_hosting_packages(): void
{
    if (count(HostingPackage::listAll()) >= 4) {
        return;
    }
    $plates = WebPlate::listAll(1, 20);
    $phpPlate = null;
    $staticPlate = null;
    foreach ($plates as $p) {
        if (($p['runtime'] ?? '') === 'php') {
            $phpPlate = $p;
        }
        if (($p['runtime'] ?? '') === 'static') {
            $staticPlate = $p;
        }
    }
    $pkgs = [
        ['Starter Web', 'Small demo hosting package', 2048, 0.5, 512, 50, 1, 2, $staticPlate],
        ['Business PHP', 'PHP showcase package', 10240, 1, 1024, 200, 3, 5, $phpPlate],
        ['Agency Pro', 'Larger demo package with mail', 51200, 2, 2048, 500, 10, 20, $phpPlate],
        ['Dev Sandbox', 'Unlimited-feel demo package', 102400, 4, 4096, 1000, 25, 50, $phpPlate],
    ];
    foreach ($pkgs as [$name, $desc, $disk, $cpu, $mem, $bw, $dbs, $mail, $plate]) {
        $exists = false;
        foreach (HostingPackage::listAll() as $row) {
            if (($row['name'] ?? '') === $name) {
                $exists = true;
                break;
            }
        }
        if ($exists) {
            continue;
        }
        $payload = [
            'name' => $name,
            'description' => $desc,
            'disk' => $disk,
            'cpu_limit' => $cpu,
            'memory_limit' => $mem,
            'bandwidth_limit_gb' => $bw,
            'database_limit' => $dbs,
            'mailbox_limit' => $mail,
        ];
        if ($plate !== null) {
            $payload['webplate_id'] = (int) $plate['id'];
        }
        if (HostingPackage::create($payload)) {
            bloat_log("Hosting package {$name}");
        }
    }
}

function ensure_ldap_demo_provider(): void
{
    $demoNames = ['Demo LDAP', 'Demo LDAP (disabled)'];
    foreach (LdapProvider::getAllProviders() as $row) {
        if (!in_array($row['name'] ?? '', $demoNames, true)) {
            continue;
        }
        // Re-enable + rename so the login LDAP chip appears.
        LdapProvider::updateProvider((string) $row['uuid'], [
            'name' => 'Demo LDAP',
            'enabled' => 'true',
        ]);
        bloat_log('LDAP demo provider enabled for login showcase');
        return;
    }
    $id = LdapProvider::createProvider([
        'uuid' => demo_uuid(),
        'name' => 'Demo LDAP',
        'host' => 'ldap.demo.featherpanel.local',
        'port' => 389,
        'base_dn' => 'dc=demo,dc=featherpanel,dc=local',
        'bind_dn' => 'cn=readonly,dc=demo,dc=featherpanel,dc=local',
        'bind_password' => 'demo-ldap-not-real',
        'user_filter' => '(uid={username})',
        'enabled' => 'true',
    ]);
    bloat_log($id ? 'LDAP demo provider (enabled, showcase)' : 'WARNING: LDAP provider create failed');
}

function ensure_even_more_schedules(array $server): void
{
    $serverId = (int) $server['id'];
    $existing = ServerSchedule::getSchedulesByServerId($serverId);
    if (count($existing) >= 5) {
        return;
    }
    $extra = [
        [
            'name' => 'Morning MOTD',
            'cron_day_of_week' => '*',
            'cron_month' => '*',
            'cron_day_of_month' => '*',
            'cron_hour' => '9',
            'cron_minute' => '0',
            'only_when_online' => 1,
            'tasks' => [
                ['action' => 'command', 'payload' => 'say Good morning from FeatherPanel Demo!', 'time_offset' => 0],
            ],
        ],
        [
            'name' => 'Midday autosave',
            'cron_day_of_week' => '*',
            'cron_month' => '*',
            'cron_day_of_month' => '*',
            'cron_hour' => '12',
            'cron_minute' => '30',
            'only_when_online' => 1,
            'tasks' => [
                ['action' => 'command', 'payload' => 'save-all', 'time_offset' => 0],
            ],
        ],
    ];
    $have = array_column($existing, 'name');
    foreach ($extra as $def) {
        if (in_array($def['name'], $have, true)) {
            continue;
        }
        $next = ServerSchedule::calculateNextRunTime(
            $def['cron_day_of_week'],
            $def['cron_month'],
            $def['cron_day_of_month'],
            $def['cron_hour'],
            $def['cron_minute'],
        );
        $scheduleId = ServerSchedule::createSchedule([
            'server_id' => $serverId,
            'name' => $def['name'],
            'cron_day_of_week' => $def['cron_day_of_week'],
            'cron_month' => $def['cron_month'],
            'cron_day_of_month' => $def['cron_day_of_month'],
            'cron_hour' => $def['cron_hour'],
            'cron_minute' => $def['cron_minute'],
            'is_active' => 1,
            'is_processing' => 0,
            'only_when_online' => $def['only_when_online'],
            'next_run_at' => $next,
        ]);
        if (!$scheduleId) {
            continue;
        }
        $seq = 1;
        foreach ($def['tasks'] as $task) {
            Task::createTask([
                'schedule_id' => (int) $scheduleId,
                'sequence_id' => $seq++,
                'action' => $task['action'],
                'payload' => $task['payload'],
                'time_offset' => $task['time_offset'],
                'is_queued' => 0,
                'continue_on_failure' => 0,
            ]);
        }
        bloat_log("Extra schedule {$def['name']} → {$server['name']}");
    }
}

function ensure_oidc_demo_provider(): void
{
    $demoNames = ['Demo OIDC', 'Demo OIDC (disabled)'];
    foreach (OidcProvider::getAllProviders() as $row) {
        if (!in_array($row['name'] ?? '', $demoNames, true)) {
            continue;
        }
        OidcProvider::updateProvider((string) $row['uuid'], [
            'name' => 'Demo OIDC',
            'enabled' => 'true',
            'auto_provision' => 'true',
        ]);
        bloat_log('OIDC demo provider enabled for login showcase');
        return;
    }

    $id = OidcProvider::createProvider([
        'uuid' => demo_uuid(),
        'name' => 'Demo OIDC',
        'issuer_url' => 'https://idp.demo.featherpanel.local',
        'client_id' => 'featherpanel-demo',
        'client_secret' => 'demo-oidc-secret-not-real',
        'scopes' => 'openid email profile',
        'email_claim' => 'email',
        'subject_claim' => 'sub',
        'auto_provision' => 'true',
        'require_email_verified' => 'false',
        'enabled' => 'true',
    ]);
    bloat_log($id ? 'OIDC demo provider (enabled, showcase)' : 'WARNING: OIDC provider create failed');
}

function ensure_more_api_keys(): void
{
    $support = User::getUserByUsername(env_str('DEMO_SUPPORT_USERNAME', 'support'));
    $mod = User::getUserByUsername(env_str('DEMO_MOD_USERNAME', 'moderator'));
    foreach ([$support, $mod] as $user) {
        if ($user === null) {
            continue;
        }
        $existing = ApiClient::getApiClientsByUserUuid((string) $user['uuid']);
        if ($existing !== []) {
            continue;
        }
        $id = ApiClient::createApiClient([
            'user_uuid' => (string) $user['uuid'],
            'name' => 'Demo Integrations',
            'description' => 'Extra demo API key — wiped with the demo. Not for production.',
            'public_key' => 'fp_' . bin2hex(random_bytes(16)),
            'private_key' => 'fp_' . bin2hex(random_bytes(32)),
            'allowed_ips' => '10.0.0.0/8,192.168.0.0/16',
            'permissions' => json_encode(['servers.read', 'users.read'], JSON_THROW_ON_ERROR),
        ]);
        if ($id) {
            bloat_log("API key for {$user['username']}");
        }
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (!file_exists(APP_PUBLIC . '/storage/config/.env')) {
    bloat_log('ERROR: .env not found.');
    exit(1);
}

$servers = healthy_demo_servers();
if ($servers === []) {
    bloat_log('WARNING: no healthy demo servers — nothing to bloat');
    exit(0);
}

$dbHostRow = null;
foreach (DatabaseInstance::getAllDatabases() as $row) {
    if (($row['name'] ?? '') === 'Demo MariaDB') {
        $dbHostRow = DatabaseInstance::getDatabaseById((int) $row['id']);
        break;
    }
}
if ($dbHostRow === null) {
    bloat_log('WARNING: Demo MariaDB host missing — server DBs skipped');
}

$spell = null;
$realmName = env_str('DEMO_REALM_NAME', 'Demo Games');
$spellName = env_str('DEMO_SPELL_NAME', 'Demo Sleep Server');
foreach (Realm::getAll(null, 100, 0) as $realm) {
    if (($realm['name'] ?? '') !== $realmName) {
        continue;
    }
    foreach (Spell::getSpellsByRealmId((int) $realm['id']) as $s) {
        if (($s['name'] ?? '') === $spellName) {
            $spell = $s;
            break 2;
        }
    }
}

ensure_more_allocations_pool();
ensure_api_clients();
ensure_more_api_keys();
ensure_blocked_ips();
ensure_blocked_email_domains();
ensure_ssh_keys();
ensure_installed_plugins($spell);
ensure_redirect_links();
ensure_command_snippets();
ensure_oidc_demo_provider();
ensure_ldap_demo_provider();
ensure_subdomain_domains();
ensure_mail_templates();
ensure_demo_images();
ensure_timed_tasks();
ensure_dns_host();
ensure_hosting_packages();
ensure_zero_trust_logs($servers);

foreach ($servers as $server) {
    ensure_server_limits($server);
    ensure_extra_allocations($server);
    if ($spell !== null) {
        ensure_spell_and_server_variables($server, $spell);
    }
    if ($dbHostRow !== null) {
        ensure_real_server_database($server, $dbHostRow, 'main', 'DemoDbMain!' . (int) $server['id']);
        ensure_real_server_database($server, $dbHostRow, 'plugins', 'DemoDbPlug!' . (int) $server['id']);
        ensure_real_server_database($server, $dbHostRow, 'stats', 'DemoDbStat!' . (int) $server['id']);
        ensure_real_server_database($server, $dbHostRow, 'logs', 'DemoDbLogs!' . (int) $server['id']);
    }
    ensure_backups($server);
    ensure_schedules($server);
    ensure_even_more_schedules($server);
    ensure_subusers($server);
    ensure_imports($server);
    ensure_more_server_activity($server);
}

ensure_demo_proxies($servers);
ensure_ghost_and_web_bloat();
ensure_mail_lists_and_forwarders();

bloat_log('Bloat seed complete for ' . count($servers) . ' servers (mega junk pack).');
exit(0);
