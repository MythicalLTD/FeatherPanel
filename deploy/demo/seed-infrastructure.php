#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Seeds demo infrastructure: location, Wings node, allocations, realm, and spell.
 * Idempotent safe to run on every bootstrap/reset cycle.
 */

define('APP_PUBLIC', '/var/www/html');
define('ENV_PATH', APP_PUBLIC . '/storage/');
define('APP_DIR', APP_PUBLIC . '/');
define('IS_CLI', true);

require_once APP_DIR . '/boot/kernel.php';

use App\App;
use App\Chat\Allocation;
use App\Chat\Location;
use App\Chat\Node;
use App\Chat\Realm;
use App\Chat\Spell;
use App\Config\ConfigInterface;
use App\Helpers\UUIDUtils;

function demo_log(string $message): void
{
    fwrite(STDOUT, '[demo-seed] ' . $message . PHP_EOL);
}

if (!file_exists(APP_PUBLIC . '/storage/config/.env')) {
    demo_log('ERROR: .env not found.');
    exit(1);
}

App::getInstance(true)->loadEnv();

$nodeName = getenv('DEMO_NODE_NAME') ?: 'Demo Node';
$locationName = getenv('DEMO_LOCATION_NAME') ?: 'Demo Datacenter';
$realmName = getenv('DEMO_REALM_NAME') ?: 'Demo Games';
$spellName = getenv('DEMO_SPELL_NAME') ?: 'Demo Server';
$wingsFqdn = getenv('DEMO_WINGS_FQDN') ?: 'wings';
$allocationIp = getenv('DEMO_ALLOCATION_IP') ?: '0.0.0.0';
$portStart = (int) (getenv('DEMO_ALLOCATION_PORT_START') ?: 25565);
$portEnd = (int) (getenv('DEMO_ALLOCATION_PORT_END') ?: 25665);

if ($portStart < 1 || $portEnd > 65535 || $portStart > $portEnd) {
    demo_log('ERROR: invalid allocation port range.');
    exit(1);
}

$location = null;
foreach (Location::getAll(null, 100, 0) as $row) {
    if (($row['name'] ?? '') === $locationName) {
        $location = $row;
        break;
    }
}

if ($location === null) {
    $locationId = Location::create([
        'name' => $locationName,
        'description' => 'Default location for the FeatherPanel public demo',
        'flag_code' => 'US',
        'type' => 'game',
    ]);
    if (!$locationId) {
        demo_log('ERROR: failed to create location.');
        exit(1);
    }
    $location = Location::getById($locationId);
    demo_log('Created location: ' . $locationName);
} else {
    demo_log('Location already exists: ' . $locationName);
}

$node = Node::getNodeByName($nodeName);
if ($node === null) {
    $nodeId = Node::create([
        'uuid' => Node::generateUuid(),
        'name' => $nodeName,
        'description' => 'Preconfigured FeatherWings node for the public demo',
        'location_id' => (int) $location['id'],
        'fqdn' => $wingsFqdn,
        'scheme' => 'http',
        'public' => 1,
        'behind_proxy' => 0,
        'maintenance_mode' => 0,
        'memory' => 8192,
        'memory_overallocate' => 0,
        'disk' => 51200,
        'disk_overallocate' => 0,
        'upload_size' => 512,
        'daemon_token_id' => Node::generateDaemonTokenId(),
        'daemon_token' => Node::generateDaemonToken(),
        'daemonListen' => 8080,
        'daemonSFTP' => 2022,
        'daemonBase' => '/var/lib/featherpanel/volumes',
    ]);

    if (!$nodeId) {
        demo_log('ERROR: failed to create node.');
        exit(1);
    }

    $node = Node::getNodeById($nodeId);
    demo_log('Created node: ' . $nodeName);
} else {
    demo_log('Node already exists: ' . $nodeName);
}

$nodeId = (int) $node['id'];
$existingAllocations = Allocation::getByNodeId($nodeId, 1000, 0);
$existingPorts = array_map(static fn (array $row): int => (int) $row['port'], $existingAllocations);
$allocationsToCreate = [];

for ($port = $portStart; $port <= $portEnd; $port++) {
    if (in_array($port, $existingPorts, true)) {
        continue;
    }
    if (!Allocation::isUniqueIpPort($nodeId, $allocationIp, $port)) {
        continue;
    }
    $allocationsToCreate[] = [
        'node_id' => $nodeId,
        'ip' => $allocationIp,
        'port' => $port,
        'ip_alias' => null,
        'server_id' => null,
        'notes' => 'Demo allocation',
    ];
}

if ($allocationsToCreate !== []) {
    $created = Allocation::createBatch($allocationsToCreate);
    demo_log('Created ' . count($created) . ' allocation(s) on ' . $nodeName);
} else {
    demo_log('Allocations already present on ' . $nodeName);
}

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
        'description' => 'Sample realm for the FeatherPanel public demo',
    ]);
    if (!$realmId) {
        demo_log('ERROR: failed to create realm.');
        exit(1);
    }
    $realm = Realm::getById($realmId);
    demo_log('Created realm: ' . $realmName);
} else {
    demo_log('Realm already exists: ' . $realmName);
}

$spellExists = false;
foreach (Spell::getSpellsByRealmId((int) $realm['id']) as $row) {
    if (($row['name'] ?? '') === $spellName) {
        $spellExists = true;
        break;
    }
}

if (!$spellExists) {
    $dockerImage = getenv('DEMO_SPELL_DOCKER_IMAGE') ?: 'ghcr.io/pterodactyl/yolks:java_21';
    $spellId = Spell::createSpell([
        'uuid' => Spell::generateUuid(),
        'realm_id' => (int) $realm['id'],
        'author' => 'FeatherPanel Demo',
        'name' => $spellName,
        'description' => 'Minimal demo spell create a server and explore the panel.',
        'docker_images' => json_encode(['Java 21' => $dockerImage], JSON_THROW_ON_ERROR),
        'default_docker_image' => $dockerImage,
        'startup' => 'java -version && echo "FeatherPanel demo server is running" && sleep infinity',
        'script_container' => 'alpine:3.20',
        'script_entry' => 'ash',
        'script_is_privileged' => 1,
        'script_install' => "#!/bin/ash\nset -e\necho 'Demo install complete' > .featherpanel-installed",
        'config_stop' => '^C',
    ]);

    if (!$spellId) {
        demo_log('ERROR: failed to create spell.');
        exit(1);
    }

    demo_log('Created spell: ' . $spellName);
} else {
    demo_log('Spell already exists: ' . $spellName);
}

$config = App::getInstance(true)->getConfig();
$panelUrl = trim((string) (getenv('DEMO_WINGS_REMOTE_URL') ?: ''));
if ($panelUrl === '') {
    $panelUrl = trim((string) $config->getSetting(ConfigInterface::APP_URL, ''));
}
if ($panelUrl === '') {
    $panelPort = trim((string) (getenv('FEATHERPANEL_PANEL_PORT') ?: '8080'));
    $panelUrl = 'http://host.docker.internal:' . $panelPort;
}

demo_log('Demo infrastructure ready (panel remote: ' . $panelUrl . ').');
exit(0);
