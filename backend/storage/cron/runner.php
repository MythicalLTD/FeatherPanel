<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

use App\Plugins\PluginManager;
use App\Config\ConfigInterface;

define('APP_STARTUP', microtime(true));
define('APP_START', microtime(true));
define('APP_PUBLIC', __DIR__);
define('APP_DIR', APP_PUBLIC . '/../../');
define('APP_STORAGE_DIR', APP_DIR . 'storage/');
define('APP_CACHE_DIR', APP_STORAGE_DIR . 'caches');
define('APP_CRON_DIR', APP_STORAGE_DIR . 'cron');
define('APP_LOGS_DIR', APP_STORAGE_DIR . 'logs');
define('APP_ADDONS_DIR', APP_STORAGE_DIR . 'addons');
define('APP_SOURCECODE_DIR', APP_DIR . 'app');
define('APP_ROUTES_DIR', APP_SOURCECODE_DIR . '/Api');
define('APP_DEBUG', false);
define('SYSTEM_OS_NAME', gethostname() . '/' . PHP_OS_FAMILY);
define('SYSTEM_KERNEL_NAME', php_uname('s'));
define('TELEMETRY', true);
define('REQUEST_ID', uniqid());
define('APP_VERSION', 'v1.1.2');
define('APP_UPSTREAM', 'stable');

if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('display_startup_errors', 0);
}

require __DIR__ . '/../packages/autoload.php';

use App\Cli\App;
use App\App as NormalApp;

$pluginManager = new PluginManager();
$app = new NormalApp(false, true);

App::sendOutputWithNewLine('&7Starting App cron runner.');

/**
 * Ensure the correct timezone is set for the cron runner.
 */
$timezone = $app->getConfig()->getSetting(ConfigInterface::APP_TIMEZONE, 'UTC');
if (!@date_default_timezone_set($timezone)) {
    $app->getLogger()->warning("Invalid timezone '$timezone', falling back to UTC.");
    date_default_timezone_set('UTC');
}

// Run main cronjobs
foreach (glob(__DIR__ . '/php/*.php') as $file) {
    App::sendOutputWithNewLine('');
    App::sendOutputWithNewLine('|----');
    require_once $file;
    $className = 'App\Cron\\' . basename($file, '.php');
    try {
        if (class_exists($className)) {
            $worker = new $className();
            App::sendOutputWithNewLine('&7Running &d' . $className . '&7.');
            $worker->run();
            App::sendOutputWithNewLine('&7Finished running &d' . $className . '&7.');
        } else {
            App::sendOutputWithNewLine('&7Class &d' . $className . '&7 not found');
        }
    } catch (Exception $e) {
        App::sendOutputWithNewLine('&7Error running &d' . $className . '&7: &c' . $e->getMessage());
    }
}

// Run addon cronjobs
$addonsDir = APP_ADDONS_DIR;
if (is_dir($addonsDir)) {
    $plugins = array_diff(scandir($addonsDir), ['.', '..']);
    foreach ($plugins as $plugin) {
        $cronDir = $addonsDir . '/' . $plugin . '/Cron';
        if (!is_dir($cronDir)) {
            continue;
        }

        foreach (glob($cronDir . '/*.php') as $file) {
            App::sendOutputWithNewLine('');
            App::sendOutputWithNewLine('|----');
            require_once $file;
            $className = 'App\Addons\\' . $plugin . '\Cron\\' . basename($file, '.php');
            try {
                if (class_exists($className)) {
                    $worker = new $className();
                    App::sendOutputWithNewLine('&7Running &d' . $className . '&7.');
                    $worker->run();
                    App::sendOutputWithNewLine('&7Finished running &d' . $className . '&7.');
                } else {
                    App::sendOutputWithNewLine('&7Class &d' . $className . '&7 not found');
                }
            } catch (Exception $e) {
                App::sendOutputWithNewLine('&7Error running &d' . $className . '&7: &c' . $e->getMessage());
            }
        }
    }
}

App::sendOutputWithNewLine('|----');
App::sendOutputWithNewLine('');
App::sendOutputWithNewLine('&7Finished running all cron workers.');
App::sendOutputWithNewLine('&7Total execution time: &d' . round(microtime(true) - APP_STARTUP, 2) . 's');
