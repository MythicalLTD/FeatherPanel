#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Seeds a rich FeatherPanel demo environment:
 * - game location + Wings node + allocations + realm/spell + sample servers
 * - web location + FeatherQuill web node + webspaces (DB-backed for UI)
 * - VPS location + fake Proxmox node + fake VMs
 * - database host pointing at the compose MariaDB service
 *
 * Idempotent — safe to run on every bootstrap/reset cycle.
 */

define('APP_PUBLIC', '/var/www/html');
define('ENV_PATH', APP_PUBLIC . '/storage/');
define('APP_DIR', APP_PUBLIC . '/');
define('IS_CLI', true);

require_once APP_DIR . '/boot/kernel.php';

use App\App;

// PluginManager (loaded by kernel) soft-boots App without a DB. Replace with CLI boot.
new App(false, false, true);
use App\Chat\Allocation;
use App\Chat\DatabaseInstance;
use App\Chat\Location;
use App\Chat\Node;
use App\Chat\Realm;
use App\Chat\Server;
use App\Chat\Spell;
use App\Chat\User;
use App\Chat\VmInstance;
use App\Chat\VmNode;
use App\Chat\WebNode;
use App\Chat\WebPlate;
use App\Chat\WebSpace;
use App\Config\ConfigInterface;

function demo_log(string $message): void
{
    fwrite(STDOUT, '[demo-seed] ' . $message . PHP_EOL);
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

/**
 * @param array<string, mixed> $attrs
 *
 * @return array<string, mixed>
 */
function ensure_location(string $name, string $type, string $description, string $flag = 'US'): array
{
    foreach (Location::getAll(null, 200, 0) as $row) {
        if (($row['name'] ?? '') === $name) {
            demo_log("Location already exists: {$name} ({$type})");

            return $row;
        }
    }

    $id = Location::create([
        'name' => $name,
        'description' => $description,
        'flag_code' => $flag,
        'type' => $type,
    ]);
    if (!$id) {
        demo_log("ERROR: failed to create location {$name}");
        exit(1);
    }

    $row = Location::getById($id);
    if ($row === null) {
        demo_log("ERROR: location {$name} missing after create");
        exit(1);
    }

    demo_log("Created location: {$name} ({$type})");

    return $row;
}

/**
 * @return array<string, mixed>
 */
function ensure_wings_node(array $location): array
{
    $nodeName = env_str('DEMO_NODE_NAME', 'Demo Wings');
    $fqdn = env_str('DEMO_WINGS_FQDN', 'localhost');
    $daemonListen = env_int('DEMO_WINGS_DAEMON_PORT', 8081);
    $daemonSftp = env_int('DEMO_WINGS_SFTP_PORT', 2022);

    $node = Node::getNodeByName($nodeName);
    if ($node !== null) {
        // Keep FQDN/ports in sync so browser → Wings works after env changes.
        Node::updateNodeById((int) $node['id'], [
            'fqdn' => $fqdn,
            'scheme' => 'http',
            'daemonListen' => $daemonListen,
            'daemonSFTP' => $daemonSftp,
            'daemonBase' => env_str('DEMO_WINGS_ROOT_PATH', '/var/lib/featherpanel-demo') . '/volumes',
            'public' => 1,
            'behind_proxy' => 0,
            'maintenance_mode' => 0,
        ]);
        $node = Node::getNodeById((int) $node['id']);
        demo_log("Node already exists (updated): {$nodeName}");

        return $node ?? [];
    }

    $nodeId = Node::create([
        'uuid' => Node::generateUuid(),
        'name' => $nodeName,
        'description' => 'Dockerized FeatherWings node for the public demo',
        'location_id' => (int) $location['id'],
        'fqdn' => $fqdn,
        'scheme' => 'http',
        'public' => 1,
        'behind_proxy' => 0,
        'maintenance_mode' => 0,
        'memory' => 16384,
        'memory_overallocate' => 0,
        'disk' => 102400,
        'disk_overallocate' => 0,
        'upload_size' => 512,
        'daemon_token_id' => Node::generateDaemonTokenId(),
        'daemon_token' => Node::generateDaemonToken(),
        'daemonListen' => $daemonListen,
        'daemonSFTP' => $daemonSftp,
        'daemonBase' => env_str('DEMO_WINGS_ROOT_PATH', '/var/lib/featherpanel-demo') . '/volumes',
    ]);

    if (!$nodeId) {
        demo_log('ERROR: failed to create Wings node.');
        exit(1);
    }

    $node = Node::getNodeById($nodeId);
    demo_log("Created Wings node: {$nodeName} ({$fqdn}:{$daemonListen})");

    return $node ?? [];
}

/**
 * @param array<string, mixed> $node
 */
function ensure_allocations(array $node): void
{
    $nodeId = (int) $node['id'];
    $allocationIp = env_str('DEMO_ALLOCATION_IP', '0.0.0.0');
    $ipAlias = env_str('DEMO_ALLOCATION_IP_ALIAS', 'localhost');
    $portStart = env_int('DEMO_ALLOCATION_PORT_START', 25565);
    $portEnd = env_int('DEMO_ALLOCATION_PORT_END', 25574);

    if ($portStart < 1 || $portEnd > 65535 || $portStart > $portEnd) {
        demo_log('ERROR: invalid allocation port range.');
        exit(1);
    }

    $existing = Allocation::getByNodeId($nodeId, 1000, 0);
    $existingPorts = array_map(static fn (array $row): int => (int) $row['port'], $existing);
    $toCreate = [];

    for ($port = $portStart; $port <= $portEnd; ++$port) {
        if (in_array($port, $existingPorts, true)) {
            continue;
        }
        if (!Allocation::isUniqueIpPort($nodeId, $allocationIp, $port)) {
            continue;
        }
        $toCreate[] = [
            'node_id' => $nodeId,
            'ip' => $allocationIp,
            'port' => $port,
            'ip_alias' => $ipAlias,
            'server_id' => null,
            'notes' => 'Demo allocation',
        ];
    }

    if ($toCreate !== []) {
        $created = Allocation::createBatch($toCreate);
        demo_log('Created ' . count($created) . " allocation(s) ({$portStart}-{$portEnd})");
    } else {
        demo_log('Allocations already present');
    }
}

/**
 * @return array{0: array<string, mixed>, 1: array<string, mixed>}
 */
function ensure_realm_and_spell(): array
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
        $realmId = Realm::create([
            'name' => $realmName,
            'description' => 'Sample realm for exploring FeatherPanel game hosting',
        ]);
        if (!$realmId) {
            demo_log('ERROR: failed to create realm.');
            exit(1);
        }
        $realm = Realm::getById($realmId);
        demo_log("Created realm: {$realmName}");
    } else {
        demo_log("Realm already exists: {$realmName}");
    }

    $spell = null;
    foreach (Spell::getSpellsByRealmId((int) $realm['id']) as $row) {
        if (($row['name'] ?? '') === $spellName) {
            $spell = $row;
            break;
        }
    }

    if ($spell === null) {
        $dockerImage = env_str('DEMO_SPELL_DOCKER_IMAGE', 'ghcr.io/pterodactyl/yolks:alpine');
        $spellId = Spell::createSpell([
            'uuid' => Spell::generateUuid(),
            'realm_id' => (int) $realm['id'],
            'author' => 'FeatherPanel Demo',
            'name' => $spellName,
            'description' => 'Lightweight demo spell (sleep infinity) so Wings can create real containers.',
            'docker_images' => json_encode(['Alpine' => $dockerImage], JSON_THROW_ON_ERROR),
            'default_docker_image' => $dockerImage,
            'startup' => 'echo "FeatherPanel demo server is running" && sleep infinity',
            'script_container' => 'alpine:3.20',
            'script_entry' => 'ash',
            'script_is_privileged' => 1,
            'script_install' => "#!/bin/ash\nset -e\necho 'Demo install complete' > .featherpanel-installed\n",
            'config_stop' => '^C',
        ]);
        if (!$spellId) {
            demo_log('ERROR: failed to create spell.');
            exit(1);
        }
        $spell = Spell::getSpellById($spellId);
        demo_log("Created spell: {$spellName}");
    } else {
        demo_log("Spell already exists: {$spellName}");
    }

    return [$realm ?? [], $spell ?? []];
}

/**
 * @param array<string, mixed> $node
 * @param array<string, mixed> $realm
 * @param array<string, mixed> $spell
 */
function ensure_game_servers(array $node, array $realm, array $spell): void
{
    $adminUser = User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin'));
    $demoUser = User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo'));
    $supportUser = User::getUserByUsername(env_str('DEMO_SUPPORT_USERNAME', 'support'));

    $owners = array_values(array_filter([
        $demoUser,
        $adminUser,
        $supportUser,
    ]));

    if ($owners === []) {
        demo_log('WARNING: no users found — skipping game servers');

        return;
    }

    $specs = [
        [
            'name' => 'Survival World',
            'description' => 'Demo survival server owned by the demo user',
            'owner' => $demoUser ?? $owners[0],
            'memory' => 1024,
            'disk' => 5120,
            'cpu' => 100,
        ],
        [
            'name' => 'Creative Sandbox',
            'description' => 'Second demo game server for multi-server UI testing',
            'owner' => $demoUser ?? $owners[0],
            'memory' => 512,
            'disk' => 2048,
            'cpu' => 50,
        ],
        [
            'name' => 'Admin Test Node',
            'description' => 'Admin-owned server for privileged workflows',
            'owner' => $adminUser ?? $owners[0],
            'memory' => 768,
            'disk' => 3072,
            'cpu' => 75,
        ],
    ];

    $image = (string) ($spell['default_docker_image'] ?? env_str('DEMO_SPELL_DOCKER_IMAGE', 'ghcr.io/pterodactyl/yolks:alpine'));
    $startup = (string) ($spell['startup'] ?? 'sleep infinity');

    foreach ($specs as $spec) {
        $owner = $spec['owner'];
        if ($owner === null) {
            continue;
        }

        $existing = Server::searchServers(1, 50, (string) $spec['name']);
        $already = false;
        foreach ($existing as $row) {
            if (($row['name'] ?? '') === $spec['name'] && (int) ($row['owner_id'] ?? 0) === (int) $owner['id']) {
                $already = true;
                break;
            }
        }
        if ($already) {
            demo_log('Server already exists: ' . $spec['name']);
            continue;
        }

        $free = Allocation::getAvailable(1, 0, (int) $node['id']);
        if ($free === []) {
            demo_log('WARNING: no free allocations left for ' . $spec['name']);
            break;
        }
        $allocation = $free[0];

        $uuid = Server::generateUuid();
        $serverId = Server::createServer([
            'uuid' => $uuid,
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
            'skip_scripts' => 0,
            'database_limit' => 2,
            'backup_limit' => 3,
            'allocation_limit' => 2,
            'show_on_status' => 1,
            'status' => 'installing',
        ]);

        if (!$serverId) {
            demo_log('ERROR: failed to create server ' . $spec['name']);
            continue;
        }

        Allocation::assignToServer((int) $allocation['id'], (int) $serverId);
        demo_log('Created server: ' . $spec['name'] . ' (id=' . $serverId . ', owner=' . $owner['username'] . ')');
    }
}

function ensure_database_host(): void
{
    $name = 'Demo MariaDB';
    foreach (DatabaseInstance::getAllDatabases() as $row) {
        if (($row['name'] ?? '') === $name) {
            demo_log('Database host already exists: ' . $name);

            return;
        }
    }

    // Prefer the compose service hostname from inside the panel network.
    $host = env_str('DEMO_DB_HOST_ADDRESS', 'mysql');
    $id = DatabaseInstance::createDatabase([
        'name' => $name,
        'database_type' => 'mariadb',
        'database_host' => $host,
        'database_port' => 3306,
        'database_username' => env_str('DATABASE_USER', 'featherpanel'),
        'database_password' => env_str('DATABASE_PASSWORD', 'featherpanel_demo_password'),
    ]);

    if (!$id) {
        demo_log('WARNING: could not create database host (continuing)');

        return;
    }

    demo_log("Created database host: {$name} → {$host}:3306");
}

/**
 * @return array<string, mixed>
 */
function ensure_web_node(array $location): array
{
    $nodeName = env_str('DEMO_QUILL_NODE_NAME', 'Demo FeatherQuill');
    $fqdn = env_str('DEMO_QUILL_FQDN', 'localhost');

    foreach (WebNode::getAllWebNodes() as $row) {
        if (($row['name'] ?? '') === $nodeName) {
            demo_log("Web node already exists: {$nodeName}");

            return $row;
        }
    }

    $nodeId = WebNode::create([
        'uuid' => WebNode::generateUuid(),
        'name' => $nodeName,
        'description' => 'Demo FeatherQuilld web node (UI + config seeded; daemon optional)',
        'location_id' => (int) $location['id'],
        'fqdn' => $fqdn,
        'scheme' => 'http',
        'public' => 1,
        'behind_proxy' => 0,
        'maintenance_mode' => 0,
        'memory' => 4096,
        'disk' => 51200,
        'upload_size' => 256,
        'daemon_token_id' => WebNode::generateDaemonTokenId(),
        'daemon_token' => WebNode::generateDaemonToken(),
        'daemonListen' => env_int('DEMO_QUILL_DAEMON_PORT', 8989),
        'daemonBase' => env_str('DEMO_QUILL_ROOT_PATH', '/var/lib/featherquilld-demo'),
        'sftpEnabled' => 1,
        'proxyEnabled' => 1,
        'proxyProvider' => 'caddy',
    ]);

    if (!$nodeId) {
        demo_log('ERROR: failed to create web node');
        exit(1);
    }

    $node = WebNode::getWebNodeById($nodeId);
    demo_log("Created FeatherQuill web node: {$nodeName}");

    return $node ?? [];
}

/**
 * @param array<string, mixed> $webNode
 */
function ensure_webspaces(array $webNode): void
{
    $plates = WebPlate::seedSystemDefaults();
    demo_log('WebPlates seed: created=' . ($plates['created'] ?? 0) . ' updated=' . ($plates['updated'] ?? 0));

    $plateList = WebPlate::listAll(1, 50);
    if ($plateList === []) {
        demo_log('WARNING: no webplates available — skipping webspaces');

        return;
    }

    $byRuntime = [];
    foreach ($plateList as $plate) {
        $runtime = (string) ($plate['runtime'] ?? 'static');
        $byRuntime[$runtime] ??= $plate;
    }

    $demoUser = User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo'));
    $adminUser = User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin'));

    $specs = [
        [
            'name' => 'Portfolio Site',
            'runtime' => 'static',
            'owner' => $demoUser,
            'domains' => ['portfolio.demo.local'],
            'status' => 'installed',
            'state' => 'running',
        ],
        [
            'name' => 'PHP Blog',
            'runtime' => 'php',
            'owner' => $demoUser,
            'domains' => ['blog.demo.local'],
            'status' => 'installed',
            'state' => 'running',
        ],
        [
            'name' => 'Node API',
            'runtime' => 'node',
            'owner' => $adminUser,
            'domains' => ['api.demo.local'],
            'status' => 'installed',
            'state' => 'stopped',
        ],
    ];

    foreach ($specs as $spec) {
        $existing = WebSpace::listAll(1, 100, null, (int) $webNode['id']);
        $already = false;
        foreach ($existing as $row) {
            if (($row['name'] ?? '') === $spec['name']) {
                $already = true;
                break;
            }
        }
        if ($already) {
            demo_log('Webspace already exists: ' . $spec['name']);
            continue;
        }

        $plate = $byRuntime[$spec['runtime']] ?? $plateList[0];
        $ownerId = isset($spec['owner']['id']) ? (int) $spec['owner']['id'] : null;

        $id = WebSpace::create([
            'name' => $spec['name'],
            'description' => 'Demo webspace for FeatherQuill / web hosting UI',
            'web_node_id' => (int) $webNode['id'],
            'webplate_id' => (int) $plate['id'],
            'owner_id' => $ownerId,
            'disk' => 2048,
            'cpu_limit' => 1,
            'memory_limit' => 512,
            'bandwidth_limit_gb' => 100,
            'database_limit' => 2,
            'mailbox_limit' => 0,
            'ssl' => 0,
            'domains' => $spec['domains'],
            'status' => $spec['status'],
            'state' => $spec['state'],
            'dns_status' => 'ok',
        ]);

        if (!$id) {
            demo_log('WARNING: failed to create webspace ' . $spec['name']);
            continue;
        }

        demo_log('Created webspace: ' . $spec['name'] . ' (' . $spec['runtime'] . ')');
    }
}

/**
 * @return array<string, mixed>
 */
function ensure_vm_node(array $location): array
{
    $nodeName = env_str('DEMO_VM_NODE_NAME', 'Demo Proxmox');

    foreach (VmNode::getAllVmNodes() as $row) {
        if (($row['name'] ?? '') === $nodeName) {
            demo_log("VM node already exists: {$nodeName}");

            return $row;
        }
    }

    $nodeId = VmNode::create([
        'name' => $nodeName,
        'description' => 'Fake Proxmox cluster for demo UI (no real PVE API)',
        'location_id' => (int) $location['id'],
        'fqdn' => env_str('DEMO_VM_FQDN', 'proxmox.demo.local'),
        'scheme' => 'https',
        'port' => 8006,
        'user' => 'demo@pve!featherpanel',
        'token_id' => 'demo-token-id',
        'secret' => 'demo-token-secret-not-real',
        'tls_no_verify' => 'true',
        'timeout' => 15,
    ]);

    if (!$nodeId) {
        demo_log('ERROR: failed to create VM node');
        exit(1);
    }

    $node = VmNode::getVmNodeById($nodeId);
    demo_log("Created fake Proxmox node: {$nodeName}");

    return $node ?? [];
}

/**
 * @param array<string, mixed> $vmNode
 */
function ensure_fake_vms(array $vmNode): void
{
    $demoUser = User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo'));
    $adminUser = User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin'));

    $specs = [
        [
            'vmid' => 101,
            'hostname' => 'web-01.demo',
            'status' => 'running',
            'vm_type' => 'qemu',
            'user' => $demoUser,
            'ip' => '10.10.0.11',
            'memory' => 2048,
            'cpus' => 2,
            'cores' => 2,
            'disk_gb' => 40,
        ],
        [
            'vmid' => 102,
            'hostname' => 'db-01.demo',
            'status' => 'running',
            'vm_type' => 'qemu',
            'user' => $demoUser,
            'ip' => '10.10.0.12',
            'memory' => 4096,
            'cpus' => 4,
            'cores' => 4,
            'disk_gb' => 80,
        ],
        [
            'vmid' => 201,
            'hostname' => 'lxc-app-01',
            'status' => 'stopped',
            'vm_type' => 'lxc',
            'user' => $adminUser,
            'ip' => '10.10.0.21',
            'memory' => 1024,
            'cpus' => 1,
            'cores' => 1,
            'disk_gb' => 20,
        ],
        [
            'vmid' => 202,
            'hostname' => 'staging-vm',
            'status' => 'running',
            'vm_type' => 'qemu',
            'user' => $adminUser,
            'ip' => '10.10.0.22',
            'memory' => 8192,
            'cpus' => 4,
            'cores' => 4,
            'disk_gb' => 120,
        ],
    ];

    foreach ($specs as $spec) {
        $existing = VmInstance::getByVmidAndNode((int) $spec['vmid'], (int) $vmNode['id']);
        if ($existing !== null) {
            demo_log('VM already exists: ' . $spec['hostname'] . ' (vmid=' . $spec['vmid'] . ')');
            continue;
        }

        $userUuid = isset($spec['user']['uuid']) ? (string) $spec['user']['uuid'] : null;
        $created = VmInstance::create([
            'vmid' => $spec['vmid'],
            'vm_node_id' => (int) $vmNode['id'],
            'user_uuid' => $userUuid,
            'pve_node' => 'pve-demo',
            'vm_type' => $spec['vm_type'],
            'hostname' => $spec['hostname'],
            'status' => $spec['status'],
            'ip_address' => $spec['ip'],
            'subnet_mask' => '255.255.255.0',
            'gateway' => '10.10.0.1',
            'notes' => 'Fake Proxmox VM for FeatherPanel demo UI',
            'backup_limit' => 3,
            'memory' => $spec['memory'],
            'cpus' => $spec['cpus'],
            'cores' => $spec['cores'],
            'disk_gb' => $spec['disk_gb'],
            'on_boot' => 1,
        ]);

        if ($created === null) {
            demo_log('WARNING: failed to create VM ' . $spec['hostname']);
            continue;
        }

        demo_log('Created fake VM: ' . $spec['hostname'] . ' (' . $spec['status'] . ')');
    }
}

function apply_demo_settings(): void
{
    $config = App::getInstance(false, false, true)->getConfig();
    $config->setSetting(ConfigInterface::APP_DEMO_YES, 'true');
    $config->setSetting(ConfigInterface::APP_NAME, 'FeatherPanel Demo');

    $appUrl = env_str('FEATHERPANEL_APP_URL', '');
    if ($appUrl !== '') {
        $config->setSetting(ConfigInterface::APP_URL, $appUrl);
    }

    $config->setSetting(ConfigInterface::REGISTRATION_ENABLED, 'false');

    demo_log('Demo settings applied (app_demo_yes=true)');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (!file_exists(APP_PUBLIC . '/storage/config/.env')) {
    demo_log('ERROR: .env not found.');
    exit(1);
}

apply_demo_settings();

$gameLocation = ensure_location(
    env_str('DEMO_LOCATION_NAME', 'Demo Game DC'),
    'game',
    'Docker Wings node for game servers',
    'US',
);
$webLocation = ensure_location(
    env_str('DEMO_WEB_LOCATION_NAME', 'Demo Web DC'),
    'web',
    'FeatherQuill web hosting location',
    'DE',
);
$vpsLocation = ensure_location(
    env_str('DEMO_VPS_LOCATION_NAME', 'Demo VPS DC'),
    'vps',
    'Fake Proxmox / VDS location for UI demos',
    'NL',
);

$wingsNode = ensure_wings_node($gameLocation);
if ($wingsNode === []) {
    demo_log('ERROR: Wings node missing');
    exit(1);
}
ensure_allocations($wingsNode);
[$realm, $spell] = ensure_realm_and_spell();
ensure_game_servers($wingsNode, $realm, $spell);
ensure_database_host();

$webNode = ensure_web_node($webLocation);
if ($webNode !== []) {
    // Keep FQDN/ports in sync for browser → Quilld
    WebNode::updateWebNodeById((int) $webNode['id'], [
        'fqdn' => env_str('DEMO_QUILL_FQDN', 'localhost'),
        'scheme' => 'http',
        'daemonListen' => env_int('DEMO_QUILL_DAEMON_PORT', 8989),
        'daemonBase' => env_str('DEMO_QUILL_ROOT_PATH', '/var/lib/featherquilld-demo'),
        'public' => 1,
        'maintenance_mode' => 0,
    ]);
    $webNode = WebNode::getWebNodeById((int) $webNode['id']) ?? $webNode;
    ensure_webspaces($webNode);
}

$vmNode = ensure_vm_node($vpsLocation);
if ($vmNode !== []) {
    ensure_fake_vms($vmNode);
}

$panelUrl = env_str('DEMO_WINGS_REMOTE_URL', 'http://backend:80');
demo_log('Demo infrastructure ready (Wings remote: ' . $panelUrl . ').');
exit(0);
