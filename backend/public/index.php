<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

use App\App;

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

/**
 * Define the environment path.
 */
define('APP_START', microtime(true));
define('APP_PUBLIC', $_SERVER['DOCUMENT_ROOT']);
define('APP_DIR', APP_PUBLIC . '/../');
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
define('APP_VERSION', 'v0.0.3');
define('APP_UPSTREAM', 'canary');

if (APP_DEBUG) {
    define('RATE_LIMIT', 500000);
} else {
    define('RATE_LIMIT', 150);
}

/**
 * Require the kernel.
 */
require_once APP_DIR . '/boot/kernel.php';

/**
 * Start the APP. with kernel!
 */
try {
    new App(false);
} catch (Exception $e) {
    echo $e->getMessage();
    exit;
}
