#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Seeds "lived-in" demo clutter so KPI dashboards, admin lists, and moderation
 * UIs look realistic: banned users, suspended / failed servers, tickets,
 * activity logs, extra webspaces & VMs.
 *
 * Idempotent — safe on every bootstrap / golden rebuild.
 */

define('APP_PUBLIC', '/var/www/html');
define('ENV_PATH', APP_PUBLIC . '/storage/');
define('APP_DIR', APP_PUBLIC . '/');
define('IS_CLI', true);

require_once APP_DIR . '/boot/kernel.php';

use App\App;
use App\Chat\Activity;
use App\Chat\Allocation;
use App\Chat\Node;
use App\Chat\Realm;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\Spell;
use App\Chat\Ticket;
use App\Chat\TicketCategory;
use App\Chat\TicketMessage;
use App\Chat\TicketPriority;
use App\Chat\TicketStatus;
use App\Chat\User;
use App\Chat\VmInstance;
use App\Chat\VmNode;
use App\Chat\WebNode;
use App\Chat\WebPlate;
use App\Chat\WebSpace;

new App(false, false, true);

function junk_log(string $message): void
{
    fwrite(STDOUT, '[demo-junk] ' . $message . PHP_EOL);
}

function env_str(string $key, string $default): string
{
    $value = getenv($key);

    return ($value === false || trim((string) $value) === '') ? $default : trim((string) $value);
}

function demo_password_hash(): string
{
    static $hash = null;
    if ($hash === null) {
        $hash = password_hash(env_str('DEMO_USER_PASSWORD', 'demoPassword'), PASSWORD_BCRYPT);
    }

    return $hash;
}

/**
 * @return array<string, mixed>|null
 */
function ensure_user(string $username, string $email, string $first, string $last, int $roleId, array $extra = []): ?array
{
    $existing = User::getUserByUsername($username);
    if ($existing !== null) {
        if ($extra !== []) {
            User::updateUser((string) $existing['uuid'], $extra);
            $existing = User::getUserByUsername($username);
        }

        return $existing;
    }

    $data = array_merge([
        'username' => $username,
        'email' => $email,
        'first_name' => $first,
        'last_name' => $last,
        'password' => demo_password_hash(),
        'uuid' => User::generateUuid(),
        'role_id' => $roleId,
        'first_ip' => $extra['first_ip'] ?? '203.0.113.' . random_int(10, 200),
        'last_ip' => $extra['last_ip'] ?? '198.51.100.' . random_int(10, 200),
    ], $extra);

    $id = User::createUser($data, true);
    if (!$id) {
        junk_log("WARNING: could not create user {$username}");

        return null;
    }

    junk_log("Created user: {$username}" . (!empty($extra['banned']) && $extra['banned'] === 'true' ? ' (banned)' : ''));

    return User::getUserByUsername($username);
}

function ensure_banned_users(): void
{
    $admin = User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin'));
    $adminUuid = $admin['uuid'] ?? null;

    $banned = [
        ['cheater99', 'Cheater', 'McBan', 'ToS: cheating / modified client'],
        ['spammer_x', 'Spam', 'Bot', 'Mass advertising in tickets'],
        ['crypto_scam', 'Crypto', 'Scam', 'Phishing links in console chat'],
        ['ddos_kid', 'Packet', 'Flood', 'Abuse reports / DDoS threats'],
        ['carder_42', 'Bad', 'Actor', 'Payment fraud investigation'],
        ['toxic_mod', 'Toxic', 'ExMod', 'Harassment of other users'],
        ['alt_farmer', 'Alt', 'Farmer', 'Ban evasion / multi-account abuse'],
        ['leaker_01', 'Data', 'Leak', 'Shared credentials publicly'],
    ];

    foreach ($banned as [$user, $first, $last, $reason]) {
        ensure_user(
            $user,
            "{$user}@banned.demo.local",
            $first,
            $last,
            1,
            [
                'banned' => 'true',
                'ban_reason' => $reason,
                'banned_at' => date('Y-m-d H:i:s', time() - random_int(86400, 86400 * 60)),
                'banned_by_uuid' => $adminUuid,
                'first_ip' => '185.220.101.' . random_int(1, 250),
                'last_ip' => '45.33.' . random_int(1, 250) . '.' . random_int(1, 250),
            ],
        );
    }

    // Extra regular clutter accounts (not banned) for user KPI volume
    for ($i = 1; $i <= 12; ++$i) {
        ensure_user(
            sprintf('player%02d', $i),
            sprintf('player%02d@demo.featherpanel.local', $i),
            'Player',
            (string) $i,
            1,
            [
                'first_ip' => '10.0.' . random_int(1, 20) . '.' . random_int(2, 250),
                'last_ip' => '10.0.' . random_int(1, 20) . '.' . random_int(2, 250),
            ],
        );
    }
}

/**
 * @return array{0: array<string, mixed>, 1: array<string, mixed>}|null
 */
function resolve_realm_spell(): ?array
{
    $realmName = env_str('DEMO_REALM_NAME', 'Demo Games');
    $spellName = env_str('DEMO_SPELL_NAME', 'Demo Sleep Server');
    $realm = null;
    foreach (Realm::getAll(null, 100, 0) as $row) {
        if (($row['name'] ?? '') === $realmName) {
            $realm = $row;
            break;
        }
    }
    if ($realm === null) {
        return null;
    }
    $spell = null;
    foreach (Spell::getSpellsByRealmId((int) $realm['id']) as $row) {
        if (($row['name'] ?? '') === $spellName) {
            $spell = $row;
            break;
        }
    }

    return ($spell !== null) ? [$realm, $spell] : null;
}

function ensure_junk_servers(): void
{
    $node = Node::getNodeByName(env_str('DEMO_NODE_NAME', 'Demo Wings'));
    $pair = resolve_realm_spell();
    if ($node === null || $pair === null) {
        junk_log('WARNING: node/realm/spell missing — skip junk servers');

        return;
    }
    [$realm, $spell] = $pair;

    $demo = User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo'));
    $admin = User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin'));
    $player01 = User::getUserByUsername('player01') ?? $demo;

    $image = (string) ($spell['default_docker_image'] ?? 'ghcr.io/pterodactyl/yolks:alpine');
    $startup = (string) ($spell['startup'] ?? 'sleep infinity');

    $specs = [
        [
            'name' => 'Suspended Skyblock',
            'description' => 'Suspended for ToS — resource abuse',
            'owner' => $demo,
            'status' => 'suspended',
            'suspended' => 1,
            'suspension_reason' => 'CPU abuse / crypto mining patterns',
            'memory' => 2048,
            'disk' => 10240,
            'cpu' => 200,
        ],
        [
            'name' => 'Banned Owner Server',
            'description' => 'Owned by banned user cheater99',
            'owner' => User::getUserByUsername('cheater99') ?? $demo,
            'status' => 'suspended',
            'suspended' => 1,
            'suspension_reason' => 'Owner account banned',
            'memory' => 1024,
            'disk' => 5120,
            'cpu' => 100,
        ],
        [
            'name' => 'Install Failed Proxy',
            'description' => 'Failed install — useful for install KPI charts',
            'owner' => $player01,
            'status' => 'install_failed',
            'suspended' => 0,
            'suspension_reason' => null,
            'memory' => 512,
            'disk' => 2048,
            'cpu' => 50,
        ],
        [
            'name' => 'Idle Lobby (offline)',
            'description' => 'Installed but left offline for status mix',
            'owner' => $admin,
            'status' => 'offline',
            'suspended' => 0,
            'suspension_reason' => null,
            'memory' => 768,
            'disk' => 3072,
            'cpu' => 75,
            'installed' => true,
        ],
        [
            'name' => 'Transfer Staging',
            'description' => 'Looks like a transfer-in-progress for UI demos',
            'owner' => $demo,
            'status' => 'transferring',
            'suspended' => 0,
            'suspension_reason' => null,
            'memory' => 1024,
            'disk' => 8192,
            'cpu' => 100,
        ],
    ];

    foreach ($specs as $spec) {
        $owner = $spec['owner'];
        if ($owner === null) {
            continue;
        }

        $existing = Server::searchServers(1, 100, (string) $spec['name']);
        $already = false;
        foreach ($existing as $row) {
            if (($row['name'] ?? '') === $spec['name']) {
                // Keep suspension flags fresh on reseed
                Server::updateServerById((int) $row['id'], [
                    'status' => $spec['status'],
                    'suspended' => $spec['suspended'],
                    'suspension_reason' => $spec['suspension_reason'],
                ]);
                $already = true;
                junk_log('Updated junk server: ' . $spec['name']);
                break;
            }
        }
        if ($already) {
            continue;
        }

        $free = Allocation::getAvailable(1, 0, (int) $node['id']);
        if ($free === []) {
            junk_log('WARNING: no free allocations for ' . $spec['name']);
            break;
        }
        $allocation = $free[0];

        $serverId = Server::createServer([
            'uuid' => Server::generateUuid(),
            'uuidShort' => Server::generateUuidShort(),
            'node_id' => (int) $node['id'],
            'name' => $spec['name'],
            'description' => $spec['description'],
            'owner_id' => (int) $owner['id'],
            'memory' => $spec['memory'],
            'swap' => 0,
            'disk' => $spec['disk'],
            'io' => 500,
            'cpu' => $spec['cpu'],
            'allocation_id' => (int) $allocation['id'],
            'realms_id' => (int) $realm['id'],
            'spell_id' => (int) $spell['id'],
            'startup' => $startup,
            'image' => $image,
            'skip_scripts' => 1,
            'database_limit' => 1,
            'backup_limit' => 1,
            'allocation_limit' => 1,
            'show_on_status' => 1,
            'status' => $spec['status'],
            'suspended' => $spec['suspended'],
            'suspension_reason' => $spec['suspension_reason'],
        ]);

        if (!$serverId) {
            junk_log('WARNING: failed to create ' . $spec['name']);
            continue;
        }

        Allocation::assignToServer((int) $allocation['id'], (int) $serverId);

        if (!empty($spec['installed'])) {
            Server::updateServerInstallationStatus((int) $serverId, 'installed', new DateTimeImmutable('-3 days'));
            Server::updateServerStatus((int) $serverId, 'offline');
        }

        junk_log('Created junk server: ' . $spec['name'] . ' (' . $spec['status'] . ')');
    }
}

function ensure_activities(): void
{
    $users = array_values(array_filter([
        User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin')),
        User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo')),
        User::getUserByUsername(env_str('DEMO_SUPPORT_USERNAME', 'support')),
        User::getUserByUsername('player01'),
        User::getUserByUsername('cheater99'),
    ]));

    if ($users === []) {
        return;
    }

    $existing = Activity::getActivitiesByUser((string) $users[0]['uuid']);
    if (count($existing) >= 20) {
        junk_log('Activity log already populated');

        return;
    }

    $events = [
        ['user:auth.login', 'Successful password login'],
        ['user:auth.login', 'Login from new device'],
        ['user:account.update', 'Updated profile avatar'],
        ['user:account.update', 'Changed notification preferences'],
        ['admin:servers.create', 'Created demo server via admin UI'],
        ['admin:servers.suspend', 'Suspended Skyblock for abuse'],
        ['admin:users.ban', 'Banned cheater99'],
        ['admin:users.ban', 'Banned spammer_x'],
        ['user:server.console', 'Opened server console'],
        ['user:server.files', 'Uploaded plugin jar'],
        ['user:server.power', 'Started Survival World'],
        ['user:server.power', 'Restarted Creative Sandbox'],
        ['user:server.backup', 'Created manual backup'],
        ['user:server.schedule', 'Created daily restart schedule'],
        ['user:ticket.create', 'Opened support ticket'],
        ['admin:ticket.reply', 'Replied to support ticket'],
        ['user:webspace.create', 'Created Portfolio Site'],
        ['user:vm.power', 'Started web-01.demo'],
        ['admin:settings.update', 'Toggled demo mode'],
        ['user:auth.failed', 'Failed login attempt'],
        ['user:auth.failed', 'Failed login attempt'],
        ['admin:nodes.view', 'Viewed Wings node diagnostics'],
        ['user:database.create', 'Created MariaDB database'],
        ['user:subuser.add', 'Invited friend as subuser'],
    ];

    $created = 0;
    foreach ($events as [$name, $context]) {
        $user = $users[array_rand($users)];
        $id = Activity::createActivity([
            'user_uuid' => (string) $user['uuid'],
            'name' => $name,
            'context' => $context,
            'ip_address' => (string) ($user['last_ip'] ?? '127.0.0.1'),
        ]);
        if ($id) {
            ++$created;
        }
    }
    junk_log("Created {$created} user activity rows");

    // Server activities for KPI charts
    $servers = Server::searchServers(1, 50, '');
    $node = Node::getNodeByName(env_str('DEMO_NODE_NAME', 'Demo Wings'));
    $nodeId = (int) ($node['id'] ?? 0);
    $serverEvents = ['server:start', 'server:stop', 'server:restart', 'server:install.completed', 'server:backup.complete', 'server:console.command', 'server:crash'];
    $sCreated = 0;
    foreach (array_slice($servers, 0, 8) as $server) {
        for ($i = 0; $i < 6; ++$i) {
            $ownerId = (int) ($server['owner_id'] ?? 0);
            $ok = ServerActivity::createActivity([
                'server_id' => (int) $server['id'],
                'node_id' => $nodeId > 0 ? $nodeId : (int) ($server['node_id'] ?? 1),
                'user_id' => $ownerId > 0 ? $ownerId : null,
                'ip' => '10.0.0.' . random_int(2, 250),
                'event' => $serverEvents[array_rand($serverEvents)],
                'metadata' => json_encode(['demo' => true, 'source' => 'seed-junk'], JSON_THROW_ON_ERROR),
            ]);
            if ($ok) {
                ++$sCreated;
            }
        }
    }
    junk_log("Created {$sCreated} server activity rows");
}

function ensure_tickets(): void
{
    $categories = TicketCategory::getAll(null, 50, 0);
    if ($categories === []) {
        foreach ([
            ['Billing', '#22c55e', 'Invoices, refunds, upgrades'],
            ['Technical', '#3b82f6', 'Server crashes, installs, networking'],
            ['Abuse', '#ef4444', 'ToS reports and bans'],
            ['General', '#a855f7', 'Everything else'],
        ] as [$name, $color, $desc]) {
            TicketCategory::create([
                'name' => $name,
                'color' => $color,
                'description' => $desc,
                'icon' => 'ticket',
            ]);
        }
        $categories = TicketCategory::getAll(null, 50, 0);
    }

    $priorities = TicketPriority::getAll(null, 50, 0);
    $statuses = TicketStatus::getAll(null, 50, 0);
    if ($categories === [] || $priorities === [] || $statuses === []) {
        junk_log('WARNING: ticket taxonomy incomplete — skip tickets');

        return;
    }

    $demo = User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo'));
    $admin = User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin'));
    $support = User::getUserByUsername(env_str('DEMO_SUPPORT_USERNAME', 'support'));
    if ($demo === null || $admin === null) {
        return;
    }

    $existing = Ticket::getAll(null, 5, 0);
    if (count($existing) >= 5) {
        junk_log('Tickets already populated');

        return;
    }

    $open = null;
    $progress = null;
    $closed = null;
    foreach ($statuses as $st) {
        $n = strtolower((string) ($st['name'] ?? ''));
        if ($n === 'open') {
            $open = $st;
        }
        if (str_contains($n, 'progress')) {
            $progress = $st;
        }
        if ($n === 'closed') {
            $closed = $st;
        }
    }
    $open ??= $statuses[0];
    $progress ??= $statuses[0];
    $closed ??= $statuses[0];

    $high = $priorities[0];
    $med = $priorities[min(1, count($priorities) - 1)];
    $low = $priorities[min(2, count($priorities) - 1)];
    foreach ($priorities as $p) {
        $n = strtolower((string) ($p['name'] ?? ''));
        if ($n === 'high') {
            $high = $p;
        }
        if ($n === 'medium') {
            $med = $p;
        }
        if ($n === 'low') {
            $low = $p;
        }
    }

    $catBy = [];
    foreach ($categories as $c) {
        $catBy[strtolower((string) $c['name'])] = $c;
    }
    $tech = $catBy['technical'] ?? $categories[0];
    $abuse = $catBy['abuse'] ?? $categories[0];
    $billing = $catBy['billing'] ?? $categories[0];
    $general = $catBy['general'] ?? $categories[0];

    $tickets = [
        [
            'user' => $demo,
            'title' => 'Survival World lagging after plugin update',
            'description' => "Hey team,\n\nAfter updating WorldEdit the TPS dropped to ~8. Console is clean though. Can you check?",
            'category' => $tech,
            'priority' => $high,
            'status' => $progress,
            'replies' => [
                [$support, 'Thanks — looking at the console logs now.', false],
                [$admin, 'Internal: likely entity lag near spawn. Suggest region purge.', true],
                [$support, 'We rolled back the plugin and TPS recovered. Closing soon if OK.', false],
            ],
        ],
        [
            'user' => $demo,
            'title' => 'Please unsuspend Skyblock',
            'description' => 'I was suspended for "mining" but I was just generating chunks. Please review.',
            'category' => $abuse,
            'priority' => $med,
            'status' => $open,
            'replies' => [
                [$support, 'We received your appeal. An admin will review resource graphs.', false],
            ],
        ],
        [
            'user' => User::getUserByUsername('player01') ?? $demo,
            'title' => 'Install failed on new proxy server',
            'description' => 'Egg install exits with code 1. Need help reading install logs.',
            'category' => $tech,
            'priority' => $med,
            'status' => $open,
            'replies' => [],
        ],
        [
            'user' => $demo,
            'title' => 'Invoice question for extra RAM',
            'description' => 'If I upgrade Survival to 4GB mid-cycle, do I pay prorated?',
            'category' => $billing,
            'priority' => $low,
            'status' => $closed,
            'replies' => [
                [$support, 'Yes — upgrades are prorated to the next renewal.', false],
                [$demo, 'Perfect, thanks!', false],
            ],
            'closed' => true,
        ],
        [
            'user' => User::getUserByUsername('player02') ?? $demo,
            'title' => 'How do I enable FeatherQuill SSL?',
            'description' => 'Want HTTPS on blog.demo.local via the webspace UI.',
            'category' => $general,
            'priority' => $low,
            'status' => $open,
            'replies' => [],
        ],
        [
            'user' => $admin,
            'title' => 'Report: cheater99 using modified client',
            'description' => 'AntiCheat flagged fly + reach. Ban applied, documenting here.',
            'category' => $abuse,
            'priority' => $high,
            'status' => $closed,
            'replies' => [
                [$admin, 'Ban confirmed. Evidence attached in internal notes.', true],
            ],
            'closed' => true,
        ],
    ];

    $made = 0;
    foreach ($tickets as $spec) {
        $user = $spec['user'];
        if ($user === null) {
            continue;
        }
        $tid = Ticket::create([
            'uuid' => Ticket::generateUuid(),
            'user_uuid' => (string) $user['uuid'],
            'category_id' => (int) $spec['category']['id'],
            'priority_id' => (int) $spec['priority']['id'],
            'status_id' => (int) $spec['status']['id'],
            'title' => $spec['title'],
            'description' => $spec['description'],
            'closed_at' => !empty($spec['closed']) ? date('Y-m-d H:i:s') : null,
        ]);
        if (!$tid) {
            continue;
        }
        ++$made;
        foreach ($spec['replies'] as [$from, $body, $internal]) {
            if ($from === null) {
                continue;
            }
            TicketMessage::create([
                'ticket_id' => $tid,
                'user_uuid' => (string) $from['uuid'],
                'message' => $body,
                'is_internal' => $internal,
            ]);
        }
    }
    junk_log("Created {$made} support tickets");
}

function ensure_extra_webspaces(): void
{
    $nodeName = env_str('DEMO_QUILL_NODE_NAME', 'Demo FeatherQuill');
    $webNode = null;
    foreach (WebNode::getAllWebNodes() as $row) {
        if (($row['name'] ?? '') === $nodeName) {
            $webNode = $row;
            break;
        }
    }
    if ($webNode === null) {
        return;
    }

    $plates = WebPlate::listAll(1, 50);
    if ($plates === []) {
        return;
    }
    $byRuntime = [];
    foreach ($plates as $plate) {
        $byRuntime[(string) ($plate['runtime'] ?? 'static')] ??= $plate;
    }

    $demo = User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo'));
    $admin = User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin'));

    $extras = [
        ['Suspended Shop', 'php', $demo, ['shop-suspended.demo.local'], 'suspended', 'stopped'],
        ['Docs Site', 'static', $admin, ['docs.demo.local'], 'installed', 'running'],
        ['Ghost Blog', 'php', $demo, ['ghost.demo.local'], 'installing', 'stopped'],
        ['Python API', 'python', $admin, ['pyapi.demo.local'], 'installed', 'running'],
        ['Failed Laravel', 'php', $demo, ['broken.demo.local'], 'install_failed', 'stopped'],
    ];

    foreach ($extras as [$name, $runtime, $owner, $domains, $status, $state]) {
        $existing = WebSpace::listAll(1, 200, null, (int) $webNode['id']);
        foreach ($existing as $row) {
            if (($row['name'] ?? '') === $name) {
                continue 2;
            }
        }
        $plate = $byRuntime[$runtime] ?? $plates[0];
        $id = WebSpace::create([
            'name' => $name,
            'description' => 'Extra demo webspace for KPI / status mix',
            'web_node_id' => (int) $webNode['id'],
            'webplate_id' => (int) $plate['id'],
            'owner_id' => isset($owner['id']) ? (int) $owner['id'] : null,
            'disk' => 1024,
            'cpu_limit' => 1,
            'memory_limit' => 256,
            'bandwidth_limit_gb' => 50,
            'database_limit' => 1,
            'mailbox_limit' => 0,
            'ssl' => 0,
            'domains' => $domains,
            'status' => $status,
            'state' => $state,
            'dns_status' => $status === 'installed' ? 'ok' : 'pending',
        ]);
        if ($id) {
            junk_log("Created webspace: {$name} ({$status})");
        }
    }
}

function ensure_extra_vms(): void
{
    $nodeName = env_str('DEMO_VM_NODE_NAME', 'Demo Proxmox');
    $vmNode = null;
    foreach (VmNode::getAllVmNodes() as $row) {
        if (($row['name'] ?? '') === $nodeName) {
            $vmNode = $row;
            break;
        }
    }
    if ($vmNode === null) {
        return;
    }

    $demo = User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo'));
    $extras = [
        [301, 'suspended-vps.demo', 'suspended', 'qemu', '10.10.0.31', 2048, 2, 40],
        [302, 'template-clone.demo', 'stopped', 'qemu', '10.10.0.32', 1024, 1, 20],
        [303, 'ci-runner.demo', 'running', 'lxc', '10.10.0.33', 4096, 4, 60],
    ];

    foreach ($extras as [$vmid, $hostname, $status, $type, $ip, $mem, $cpus, $disk]) {
        if (VmInstance::getByVmidAndNode($vmid, (int) $vmNode['id']) !== null) {
            continue;
        }
        $created = VmInstance::create([
            'vmid' => $vmid,
            'vm_node_id' => (int) $vmNode['id'],
            'user_uuid' => $demo['uuid'] ?? null,
            'pve_node' => 'pve-demo',
            'vm_type' => $type,
            'hostname' => $hostname,
            'status' => $status,
            'ip_address' => $ip,
            'subnet_mask' => '255.255.255.0',
            'gateway' => '10.10.0.1',
            'notes' => 'Extra fake Proxmox VM for demo KPIs',
            'backup_limit' => 2,
            'memory' => $mem,
            'cpus' => $cpus,
            'cores' => $cpus,
            'disk_gb' => $disk,
            'on_boot' => $status === 'running' ? 1 : 0,
        ]);
        if ($created !== null) {
            junk_log("Created fake VM: {$hostname} ({$status})");
        }
    }
}

// ---------------------------------------------------------------------------
if (!file_exists(APP_PUBLIC . '/storage/config/.env')) {
    junk_log('ERROR: .env not found.');
    exit(1);
}

ensure_banned_users();
ensure_junk_servers();
ensure_activities();
ensure_tickets();
ensure_extra_webspaces();
ensure_extra_vms();

junk_log('Junk / KPI seed complete.');
exit(0);
