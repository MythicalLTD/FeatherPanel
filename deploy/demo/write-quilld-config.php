#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Writes FeatherQuilld config.yml from the demo web node (for optional daemon use).
 */

define('APP_PUBLIC', '/var/www/html');
define('ENV_PATH', APP_PUBLIC . '/storage/');
define('APP_DIR', APP_PUBLIC . '/');
define('IS_CLI', true);

require_once APP_DIR . '/boot/kernel.php';

use App\App;
use App\Chat\WebNode;
use App\Config\ConfigInterface;

function quill_log(string $message): void
{
    fwrite(STDOUT, '[demo-quill] ' . $message . PHP_EOL);
}

if (!file_exists(APP_PUBLIC . '/storage/config/.env')) {
    quill_log('ERROR: .env not found.');
    exit(1);
}

// Replace kernel soft-boot with CLI DB boot
$app = new App(false, false, true);

$configPath = getenv('DEMO_QUILL_CONFIG_PATH') ?: '/etc/featherquilld/config.yml';
$nodeName = getenv('DEMO_QUILL_NODE_NAME') ?: 'Demo FeatherQuill';

$node = null;
foreach (WebNode::getAllWebNodes() as $row) {
    if (($row['name'] ?? '') === $nodeName) {
        $node = $row;
        break;
    }
}

if ($node === null) {
    quill_log('ERROR: demo web node not found: ' . $nodeName);
    exit(1);
}

$panelUrl = trim((string) (getenv('DEMO_WINGS_REMOTE_URL') ?: ''));
if ($panelUrl === '') {
    $panelUrl = trim((string) $app->getConfig()->getSetting(ConfigInterface::APP_URL, ''));
}
if ($panelUrl === '') {
    $panelUrl = 'http://backend:80';
}

$quillRoot = rtrim(getenv('DEMO_QUILL_ROOT_PATH') ?: '/var/lib/featherquilld-demo', '/');
$port = (int) ($node['daemonListen'] ?? 8989);
$sftpPort = (int) (getenv('DEMO_QUILL_SFTP_PORT') ?: 2222);

// Panel builder is minimal; append Docker-friendly system paths (host==container).
$baseYaml = WebNode::generateFeatherQuilldConfigYaml($node, $panelUrl);
$extra = <<<YAML

# --- demo docker overrides ---
system:
  data: {$quillRoot}/webspaces
  root_directory: {$quillRoot}
  tmp_directory: /tmp/featherquilld-demo
  log_directory: /var/log/featherquilld
api:
  host: 0.0.0.0
  port: {$port}
sftp:
  enabled: true
  bind_address: 0.0.0.0
  port: {$sftpPort}
YAML;

// Prefer a coherent single document: rewrite with known-good demo shape when tokens exist.
$uuid = (string) ($node['uuid'] ?? '');
$tokenId = (string) ($node['daemon_token_id'] ?? '');
$token = (string) ($node['daemon_token'] ?? '');
if ($uuid !== '' && $tokenId !== '' && $token !== '') {
    $yaml = <<<YAML
debug: true
uuid: {$uuid}
token_id: {$tokenId}
token: {$token}
api:
  host: 0.0.0.0
  port: {$port}
  ssl:
    enabled: false
    cert: cert.pem
    key: key.pem
  upload_limit: 256
remote:
  panel: '{$panelUrl}'
  config_path: /api/quilld-remote/config
  health_path: /api/quilld-remote/health
  app_name: 'FeatherPanel Demo'
  timeout: 30
  retry_limit: 10
  custom_headers: {  }
system:
  root_directory: {$quillRoot}
  data: {$quillRoot}/webspaces
  tmp_directory: /tmp/featherquilld-demo
  log_directory: /var/log/featherquilld
  backups:
    provider: local
  proxy:
    enabled: true
    provider: caddy
    acme_staging: true
    backend_port_min: 20000
    backend_port_max: 29999
    backend_host: 127.0.0.1
    backend_bind_host: 127.0.0.1
sftp:
  # Distroless Quilld image has no ssh-keygen; disable SFTP in Docker demo.
  enabled: false
  bind_address: 0.0.0.0
  port: {$sftpPort}
  key_algorithm: ssh-ed25519
ftp:
  enabled: false
YAML;
} else {
    $yaml = rtrim($baseYaml) . "\n" . $extra;
}

$configDir = dirname($configPath);
if (!is_dir($configDir) && !mkdir($configDir, 0755, true) && !is_dir($configDir)) {
    quill_log('ERROR: cannot create config directory: ' . $configDir);
    exit(1);
}

if (file_put_contents($configPath, $yaml) === false) {
    quill_log('ERROR: failed to write ' . $configPath);
    exit(1);
}

chmod($configPath, 0640);
quill_log('Wrote FeatherQuilld config for "' . $nodeName . '" → ' . $configPath . " (remote={$panelUrl}, root={$quillRoot})");
exit(0);
