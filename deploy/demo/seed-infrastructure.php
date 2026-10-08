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
use App\Chat\KnowledgebaseArticle;
use App\Chat\KnowledgebaseCategory;
use App\Chat\Location;
use App\Chat\Node;
use App\Chat\Notification;
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
 * Public hostnames sit behind Cloudflare Tunnel → browsers must use https/wss
 * without :daemonPort. Localhost keeps http + explicit port.
 *
 * @return array{scheme: string, behind_proxy: int}
 */
function demo_public_edge(string $fqdn, string $schemeEnv, string $proxyEnv): array
{
    $host = strtolower(trim($fqdn));
    $isLocal = $host === ''
        || $host === 'localhost'
        || $host === '127.0.0.1'
        || str_ends_with($host, '.local')
        || str_ends_with($host, '.localhost');

    $schemeOverride = strtolower(env_str($schemeEnv, ''));
    $scheme = in_array($schemeOverride, ['http', 'https'], true)
        ? $schemeOverride
        : ($isLocal ? 'http' : 'https');

    $proxyRaw = env_str($proxyEnv, '');
    if ($proxyRaw !== '') {
        $behind = filter_var($proxyRaw, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    } else {
        $behind = $isLocal ? 0 : 1;
    }

    return ['scheme' => $scheme, 'behind_proxy' => $behind];
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
    $edge = demo_public_edge($fqdn, 'DEMO_WINGS_SCHEME', 'DEMO_WINGS_BEHIND_PROXY');

    $node = Node::getNodeByName($nodeName);
    if ($node !== null) {
        // Keep FQDN/ports/scheme in sync so browser → Wings works after env changes.
        Node::updateNodeById((int) $node['id'], [
            'fqdn' => $fqdn,
            'scheme' => $edge['scheme'],
            'daemonListen' => $daemonListen,
            'daemonSFTP' => $daemonSftp,
            'daemonBase' => env_str('DEMO_WINGS_ROOT_PATH', '/var/lib/featherpanel-demo') . '/volumes',
            'public' => 1,
            'behind_proxy' => $edge['behind_proxy'],
            'maintenance_mode' => 0,
        ]);
        $node = Node::getNodeById((int) $node['id']);
        demo_log("Node already exists (updated): {$nodeName} ({$edge['scheme']}://{$fqdn}, behind_proxy={$edge['behind_proxy']})");

        return $node ?? [];
    }

    $nodeId = Node::create([
        'uuid' => Node::generateUuid(),
        'name' => $nodeName,
        'description' => 'Dockerized FeatherWings node for the public demo',
        'location_id' => (int) $location['id'],
        'fqdn' => $fqdn,
        'scheme' => $edge['scheme'],
        'public' => 1,
        'behind_proxy' => $edge['behind_proxy'],
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
    demo_log("Created Wings node: {$nodeName} ({$edge['scheme']}://{$fqdn}:{$daemonListen}, behind_proxy={$edge['behind_proxy']})");

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
            'database_limit' => 5,
            'backup_limit' => 8,
            'allocation_limit' => 4,
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
    $edge = demo_public_edge($fqdn, 'DEMO_QUILL_SCHEME', 'DEMO_QUILL_BEHIND_PROXY');
    $daemonListen = env_int('DEMO_QUILL_DAEMON_PORT', 8989);

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
        'scheme' => $edge['scheme'],
        'public' => 1,
        'behind_proxy' => $edge['behind_proxy'],
        'maintenance_mode' => 0,
        'memory' => 4096,
        'disk' => 51200,
        'upload_size' => 256,
        'daemon_token_id' => WebNode::generateDaemonTokenId(),
        'daemon_token' => WebNode::generateDaemonToken(),
        'daemonListen' => $daemonListen,
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
    demo_log("Created FeatherQuill web node: {$nodeName} ({$edge['scheme']}://{$fqdn}, behind_proxy={$edge['behind_proxy']})");

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
        [
            'name' => 'Docs Hub',
            'runtime' => 'static',
            'owner' => $adminUser,
            'domains' => ['docs.demo.local'],
            'status' => 'installed',
            'state' => 'running',
        ],
        [
            'name' => 'Laravel Shop',
            'runtime' => 'php',
            'owner' => $demoUser,
            'domains' => ['shop.demo.local', 'www.shop.demo.local'],
            'status' => 'installed',
            'state' => 'running',
        ],
        [
            'name' => 'Staging Node App',
            'runtime' => 'node',
            'owner' => $demoUser,
            'domains' => ['staging-app.demo.local'],
            'status' => 'installed',
            'state' => 'stopped',
        ],
        [
            'name' => 'Broken Install Site',
            'runtime' => 'php',
            'owner' => $demoUser,
            'domains' => ['broken.demo.local'],
            'status' => 'install_failed',
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
            'database_limit' => 3,
            'mailbox_limit' => 5,
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
    $config->setSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false');

    $appUrl = env_str('FEATHERPANEL_APP_URL', '');
    if ($appUrl !== '') {
        $config->setSetting(ConfigInterface::APP_URL, $appUrl);
    }

    // JWT issuer must match Wings `remote:` (Docker DNS), not the public APP_URL.
    $wingsRemote = env_str('DEMO_WINGS_REMOTE_URL', 'http://backend:80');
    $config->setSetting(ConfigInterface::WINGS_REMOTE_URL, $wingsRemote);

    // Public-demo safety (not production-ready configs).
    $config->setSetting(ConfigInterface::REGISTRATION_ENABLED, 'false');
    $config->setSetting(ConfigInterface::USER_ALLOW_ACCOUNT_DELETION, 'false');
    $config->setSetting(ConfigInterface::TICKET_SYSTEM_ALLOW_ATTACHMENTS, 'false');
    $config->setSetting(ConfigInterface::EMAIL_LOGIN_ENABLED, 'false');
    $config->setSetting(ConfigInterface::SMTP_ENABLED, 'false');
    $config->setSetting(ConfigInterface::TELEMETRY, 'false');

    // Showcase features visitors should be able to click through.
    $config->setSetting(ConfigInterface::STATUS_PAGE_ENABLED, 'true');
    $config->setSetting(ConfigInterface::STATUS_PAGE_PUBLIC_ENABLED, 'true');
    $config->setSetting(ConfigInterface::STATUS_PAGE_SHOW_NODE_STATUS, 'true');
    $config->setSetting(ConfigInterface::STATUS_PAGE_SHOW_LOAD_USAGE, 'true');
    $config->setSetting(ConfigInterface::STATUS_PAGE_SHOW_TOTAL_SERVERS, 'true');
    $config->setSetting(ConfigInterface::STATUS_PAGE_SHOW_INDIVIDUAL_NODES, 'true');
    $config->setSetting(ConfigInterface::STATUS_PAGE_SHOW_PLAYER_COUNT, 'true');
    $config->setSetting(ConfigInterface::STATUS_PAGE_SERVERS_VISIBLE_BY_DEFAULT, 'true');

    $config->setSetting(ConfigInterface::FILE_TRASH_ENABLED, 'true');
    $config->setSetting(ConfigInterface::FILE_TRASH_MAX_SIZE_MB, '512');
    $config->setSetting(ConfigInterface::FILE_TRASH_RETENTION_DAYS, '7');

    $config->setSetting(ConfigInterface::CHATBOT_ENABLED, 'true');
    $config->setSetting(ConfigInterface::CHATBOT_AI_PROVIDER, 'basic');
    $config->setSetting(ConfigInterface::CHATBOT_DISPLAY_NAME, 'Feather Demo AI');
    $config->setSetting(
        ConfigInterface::CHATBOT_SYSTEM_PROMPT,
        'You are FeatherPanel Demo AI. This is a public demo — some actions are limited, spoofed, or wiped on a schedule.'
    );

    $config->setSetting(ConfigInterface::KNOWLEDGEBASE_ENABLED, 'true');
    $config->setSetting(ConfigInterface::KNOWLEDGEBASE_PUBLIC_ENABLED, 'true');
    $config->setSetting(ConfigInterface::KNOWLEDGEBASE_SHOW_CATEGORIES, 'true');
    $config->setSetting(ConfigInterface::KNOWLEDGEBASE_SHOW_ARTICLES, 'true');
    $config->setSetting(ConfigInterface::KNOWLEDGEBASE_SHOW_TAGS, 'true');

    $config->setSetting(ConfigInterface::TICKET_SYSTEM_ENABLED, 'true');
    $config->setSetting(ConfigInterface::TICKET_SYSTEM_MAX_OPEN_TICKETS, '5');

    $config->setSetting(ConfigInterface::SERVER_ALLOW_SCHEDULES, 'true');
    $config->setSetting(ConfigInterface::SERVER_ALLOW_SUBUSERS, 'true');
    $config->setSetting(ConfigInterface::SERVER_ALLOW_ALLOCATION_SELECT, 'true');
    $config->setSetting(ConfigInterface::SERVER_ALLOW_STARTUP_CHANGE, 'true');
    $config->setSetting(ConfigInterface::SERVER_ALLOW_EGG_CHANGE, 'true');
    $config->setSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FIREWALL, 'true');
    $config->setSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_PROXY, 'true');
    $config->setSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FASTDL, 'true');
    $config->setSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_IMPORT, 'true');
    // Subdomains need real Cloudflare credentials — keep off on the public demo.
    $config->setSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_SUBDOMAINS, 'false');
    $config->setSetting(ConfigInterface::SERVER_ALLOW_USER_SERVER_DELETION, 'false');

    // FeatherZeroTrust malware scanner UI — enabled with fake history from seed-bloat.
    $config->setSetting('featherzerotrust.enabled', 'true');
    $config->setSetting('featherzerotrust.scan_interval', '30');
    $config->setSetting('featherzerotrust.auto_suspend', 'false');
    $config->setSetting('featherzerotrust.webhook_enabled', 'false');

    demo_log('Demo settings applied (rich feature flags + demo safety locks, wings_remote_url=' . $wingsRemote . ')');
}

function ensure_knowledgebase(): void
{
    $gettingStarted = KnowledgebaseCategory::getBySlug('getting-started');
    if ($gettingStarted === null) {
        $catId = KnowledgebaseCategory::create([
            'name' => 'Getting Started',
            'slug' => 'getting-started',
            'icon' => 'book-open',
            'description' => 'Welcome guides for the FeatherPanel demo',
            'position' => 1,
        ]);
        $gettingStarted = $catId ? KnowledgebaseCategory::getById((int) $catId) : null;
        demo_log($gettingStarted ? 'Created knowledgebase category: Getting Started' : 'WARNING: failed to create KB category');
    }

    $features = KnowledgebaseCategory::getBySlug('panel-features');
    if ($features === null) {
        $catId = KnowledgebaseCategory::create([
            'name' => 'Panel Features',
            'slug' => 'panel-features',
            'icon' => 'sparkles',
            'description' => 'Highlights of what FeatherPanel can do',
            'position' => 2,
        ]);
        $features = $catId ? KnowledgebaseCategory::getById((int) $catId) : null;
        demo_log($features ? 'Created knowledgebase category: Panel Features' : 'WARNING: failed to create KB category');
    }

    $admin = User::getUserByUsername(env_str('DEMO_ADMIN_USERNAME', 'admin'))
        ?? User::getUserByUsername(env_str('DEMO_USER_USERNAME', 'demo'));
    if ($admin === null) {
        demo_log('WARNING: no admin user for knowledgebase author — skipping articles');

        return;
    }

    $authorId = (int) $admin['id'];
    $articles = [
        [
            'category' => $gettingStarted,
            'title' => 'Welcome to the FeatherPanel Demo',
            'slug' => 'welcome-to-the-demo',
            'content' => <<<'MD'
# Welcome

This is a **public FeatherPanel demo**. It periodically wipes, and some features are limited, disabled, or spoofed.

## What you can explore
- Game servers (console, files, trash bin, schedules, subusers)
- Tickets & knowledgebase
- Status page
- Webspaces & fake VDS inventory
- Built-in demo AI chatbot (basic provider — no external API key)

## Not for production
Cloud linking, SMTP, OAuth secrets, plugin uploads, developer console, and DB snapshots are disabled here.
MD
            ,
        ],
        [
            'category' => $features,
            'title' => 'File manager & trash bin',
            'slug' => 'file-manager-trash-bin',
            'content' => <<<'MD'
# File manager

Open any running demo server → **Files**. Delete something to see the **trash bin** (enabled on this demo).

Restoring from trash works like production. The whole environment still resets on a schedule.
MD
            ,
        ],
        [
            'category' => $features,
            'title' => 'AI chatbot (demo mode)',
            'slug' => 'ai-chatbot-demo-mode',
            'content' => <<<'MD'
# Feather Demo AI

The chatbot is enabled with the **basic** provider so you can try the UI without an API key.

In a real panel you would connect Google Gemini, OpenAI, OpenRouter, Ollama, etc. Those keys are intentionally not configured here.
MD
            ,
        ],
    ];

    foreach ($articles as $spec) {
        $category = $spec['category'];
        if (!is_array($category) || empty($category['id'])) {
            continue;
        }
        if (KnowledgebaseArticle::getBySlug($spec['slug']) !== null) {
            continue;
        }
        $id = KnowledgebaseArticle::create([
            'category_id' => (int) $category['id'],
            'title' => $spec['title'],
            'slug' => $spec['slug'],
            'icon' => 'file-text',
            'content' => $spec['content'],
            'author_id' => $authorId,
            'status' => 'published',
            'pinned' => $spec['slug'] === 'welcome-to-the-demo',
            'sort_order' => 0,
            'published_at' => gmdate('Y-m-d H:i:s'),
        ]);
        demo_log($id ? 'Created KB article: ' . $spec['title'] : 'WARNING: failed article ' . $spec['slug']);
    }
}

function ensure_demo_announcements(): void
{
    $existing = Notification::searchNotifications(1, 50, 'FeatherPanel DEMO notice');
    foreach ($existing as $row) {
        if (($row['title'] ?? '') === 'FeatherPanel DEMO notice') {
            demo_log('Demo announcement already present');

            return;
        }
    }

    $id = Notification::createNotification([
        'title' => 'FeatherPanel DEMO notice',
        'message_markdown' => "This panel **wipes on a schedule**. Some features are **enabled for showcase**, others are **disabled or spoofed** (Cloud, SMTP, secrets, developer tools). Config here is **not suitable for production**.",
        'type' => 'warning',
        'is_dismissible' => true,
        'is_sticky' => true,
        'user_id' => null,
        'server_id' => null,
    ]);

    demo_log($id ? 'Created demo announcement banner' : 'WARNING: failed to create demo announcement');
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
    // Keep FQDN/ports/scheme in sync for browser → Quilld
    $quillFqdn = env_str('DEMO_QUILL_FQDN', 'localhost');
    $quillEdge = demo_public_edge($quillFqdn, 'DEMO_QUILL_SCHEME', 'DEMO_QUILL_BEHIND_PROXY');
    WebNode::updateWebNodeById((int) $webNode['id'], [
        'fqdn' => $quillFqdn,
        'scheme' => $quillEdge['scheme'],
        'behind_proxy' => $quillEdge['behind_proxy'],
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

ensure_knowledgebase();
ensure_demo_announcements();

$panelUrl = env_str('DEMO_WINGS_REMOTE_URL', 'http://backend:80');
demo_log('Demo infrastructure ready (Wings remote: ' . $panelUrl . ').');
exit(0);
