#!/usr/bin/env php
<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

use App\Cli\App;

if (!empty($_SERVER['DOCUMENT_ROOT'])) {
    define('APP_PUBLIC', $_SERVER['DOCUMENT_ROOT'] . '/backend');
} else {
    define('APP_PUBLIC', __DIR__ . '/backend');
}

define('ENV_PATH', APP_PUBLIC . '/storage/');
define('APP_START', microtime(true));
define('APP_DIR', APP_PUBLIC . '/');
define('APP_CRON_DIR', APP_PUBLIC . '/storage/cron/');
define('SYSTEM_KERNEL_NAME', php_uname('s'));
define( 'APP_VERSION', 'v1.2.2');
define('APP_UPSTREAM', 'stable');
define('TELEMETRY', true);
define('IS_CLI', true);
define('REQUEST_ID', uniqid());

require_once APP_DIR . '/boot/kernel.php';

try {
    $args = array_slice($argv, 1); // Exclude the command name and the first argument
    new App($argv[1] ?? '', $args);
} catch (Exception $e) {
    echo $e->getMessage();
}
