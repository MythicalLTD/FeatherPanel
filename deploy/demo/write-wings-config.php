#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Writes a Docker-friendly FeatherWings config.yml from the demo node.
 *
 * The panel's generateWingsConfigYaml() is intentionally minimal; Wings then
 * expands defaults (including uid 988) which breaks bind-mounted volumes in
 * compose. This writer emits a complete config suited to the demo stack.
 */

define('APP_PUBLIC', '/var/www/html');
define('ENV_PATH', APP_PUBLIC . '/storage/');
define('APP_DIR', APP_PUBLIC . '/');
define('IS_CLI', true);

require_once APP_DIR . '/boot/kernel.php';

use App\App;
use App\Chat\Node;
use App\Config\ConfigInterface;

function wings_log(string $message): void
{
    fwrite(STDOUT, '[demo-wings] ' . $message . PHP_EOL);
}

if (!file_exists(APP_PUBLIC . '/storage/config/.env')) {
    wings_log('ERROR: .env not found.');
    exit(1);
}

// Replace kernel soft-boot with CLI DB boot
$app = new App(false, false, true);

$configPath = getenv('DEMO_WINGS_CONFIG_PATH') ?: '/etc/featherpanel/config.yml';
$nodeName = getenv('DEMO_NODE_NAME') ?: 'Demo Wings';

$node = Node::getNodeByName($nodeName);
if ($node === null) {
    wings_log('ERROR: demo node not found: ' . $nodeName);
    exit(1);
}

$panelUrl = trim((string) (getenv('DEMO_WINGS_REMOTE_URL') ?: ''));
if ($panelUrl === '') {
    $panelUrl = trim((string) $app->getConfig()->getSetting(ConfigInterface::APP_URL, ''));
}
if ($panelUrl === '') {
    $panelUrl = 'http://backend:80';
}
$panelUrl = rtrim($panelUrl, '/');

$uuid = (string) ($node['uuid'] ?? '');
$tokenId = (string) ($node['daemon_token_id'] ?? '');
$token = (string) ($node['daemon_token'] ?? '');
$port = (int) ($node['daemonListen'] ?? 8081);
$sftpPort = (int) ($node['daemonSFTP'] ?? 2022);
$fqdn = (string) ($node['fqdn'] ?? 'localhost');
$uploadLimit = (int) ($node['upload_size'] ?? 512);
// Cloudflare Tunnel (and local demo) speak plain HTTP to the container.
// Node scheme may be https for browser wss:// — that must not enable in-daemon TLS.
$behindProxy = filter_var($node['behind_proxy'] ?? false, FILTER_VALIDATE_BOOLEAN);
$ssl = (($node['scheme'] ?? 'http') === 'https' && !$behindProxy) ? 'true' : 'false';

// Prefer decrypted tokens if Node model returned them encrypted.
if ($tokenId === '' || $token === '') {
    wings_log('ERROR: node is missing daemon tokens');
    exit(1);
}

// Host path == in-container path. Docker Engine bind-mounts resolve on the host,
// so Wings-in-Docker cannot use a remapped path like /var/lib/featherpanel when
// the host directory is actually /var/lib/featherpanel-demo.
$wingsRoot = rtrim(getenv('DEMO_WINGS_ROOT_PATH') ?: '/var/lib/featherpanel-demo', '/');
$dataPath = $wingsRoot . '/volumes';
$tmpPath = getenv('DEMO_WINGS_TMP_PATH') ?: '/tmp/featherpanel-demo-wings';

// FeatherWings hardcodes Docker bridge name "featherpanel0". If a host Wings
// already owns that bridge, we MUST reuse its network name so NetworkInspect
// succeeds and createDockerNetwork is skipped. Override via env when needed.
$dockerNetwork = getenv('DEMO_WINGS_DOCKER_NETWORK') ?: 'featherpanel_nw';
$dockerSubnet = getenv('DEMO_WINGS_DOCKER_SUBNET') ?: '172.19.0.0/16';
$dockerGateway = getenv('DEMO_WINGS_DOCKER_GATEWAY') ?: '172.19.0.1';

// Wings remaps system.user.uid/gid to the "featherpanel" OS user (typically 988).
// Keep data dirs owned by that uid (see restart-wings.sh).
$wingsUid = (int) (getenv('DEMO_WINGS_UID') ?: 988);
$wingsGid = (int) (getenv('DEMO_WINGS_GID') ?: 988);

$yaml = <<<YAML
debug: true
uuid: {$uuid}
token_id: {$tokenId}
token: {$token}
api:
  host: 0.0.0.0
  port: {$port}
  ssl:
    enabled: {$ssl}
    cert: /etc/letsencrypt/live/{$fqdn}/fullchain.pem
    key: /etc/letsencrypt/live/{$fqdn}/privkey.pem
  upload_limit: {$uploadLimit}
system:
  root_directory: {$wingsRoot}
  log_directory: /var/log/featherpanel
  data: {$dataPath}
  archive_directory: {$wingsRoot}/archives
  backup_directory: {$wingsRoot}/backups
  diffs_directory: {$wingsRoot}/diffs
  tmp_directory: {$tmpPath}
  username: featherpanel
  timezone: UTC
  user:
    rootless:
      enabled: false
      container_uid: 0
      container_gid: 0
    uid: {$wingsUid}
    gid: {$wingsGid}
    mount_passwd: false
  check_permissions_on_boot: false
  openat_mode: none
  # Must be a host==container path when Wings runs in Docker (same as data/).
  machine_id:
    enabled: true
    directory: {$wingsRoot}/machine-id
  sftp:
    bind_address: 0.0.0.0
    bind_port: {$sftpPort}
    read_only: false
docker:
  network:
    interface: {$dockerGateway}
    dns:
      - 1.1.1.1
      - 1.0.0.1
    name: {$dockerNetwork}
    ispn: false
    IPv6: false
    driver: bridge
    network_mode: {$dockerNetwork}
    is_internal: false
    enable_icc: true
    network_mtu: 1500
    interfaces:
      v4:
        subnet: {$dockerSubnet}
        gateway: {$dockerGateway}
allowed_mounts: []
remote: '{$panelUrl}'
ignore_panel_config_updates: true
BlockBaseDirMount: false
YAML;

$configDir = dirname($configPath);
if (!is_dir($configDir) && !mkdir($configDir, 0755, true) && !is_dir($configDir)) {
    wings_log('ERROR: cannot create config directory: ' . $configDir);
    exit(1);
}

if (file_put_contents($configPath, $yaml) === false) {
    wings_log('ERROR: failed to write ' . $configPath);
    exit(1);
}

chmod($configPath, 0640);
wings_log('Wrote Docker Wings config for "' . $nodeName . '" → ' . $configPath . " (remote={$panelUrl}, uid={$wingsUid}, network={$dockerNetwork})");
exit(0);
