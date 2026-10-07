#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Writes FeatherWings config.yml from the demo node registered in the panel.
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

App::getInstance(true)->loadEnv();

$configPath = getenv('DEMO_WINGS_CONFIG_PATH') ?: '/etc/featherpanel/config.yml';
$nodeName = getenv('DEMO_NODE_NAME') ?: 'Demo Node';

$node = Node::getNodeByName($nodeName);
if ($node === null) {
    wings_log('ERROR: demo node not found: ' . $nodeName);
    exit(1);
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

$yaml = Node::generateWingsConfigYaml($node, $panelUrl);
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
wings_log('Wrote Wings config for node "' . $nodeName . '" to ' . $configPath);
exit(0);
