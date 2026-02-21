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

use App\App;

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
define('APP_DEBUG', true);
define('SYSTEM_OS_NAME', gethostname() . '/' . PHP_OS_FAMILY);
define('SYSTEM_KERNEL_NAME', php_uname('s'));
define('TELEMETRY', true);
define('APP_VERSION', 'v1.2.5');
define('APP_UPSTREAM', 'stable');
define('REQUEST_ID', uniqid());

if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('display_startup_errors', 0);
}

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
