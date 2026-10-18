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

/*
 * Process-wide constants shared by the HTTP entry points: public/index.php
 * (php-fpm and FrankenPHP classic mode) and boot/worker.php (FrankenPHP
 * worker mode). Only values that never change between requests belong here;
 * request-scoped values live in App\Runtime\RequestContext.
 */

if (!defined('APP_PUBLIC')) {
    $featherpanelPublic = !empty($_SERVER['DOCUMENT_ROOT']) && is_file($_SERVER['DOCUMENT_ROOT'] . '/index.php')
        ? $_SERVER['DOCUMENT_ROOT']
        : dirname(__DIR__) . '/public';
    define('APP_PUBLIC', $featherpanelPublic);
    unset($featherpanelPublic);
}
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
define('APP_VERSION', 'v1.4.2');
define('APP_UPSTREAM', 'stable');

if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
} else {
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
    ini_set('display_errors', 0);
    ini_set('display_startup_errors', 0);
}

if (APP_DEBUG) {
    define('RATE_LIMIT', 500000);
} else {
    define('RATE_LIMIT', 150);
}
