<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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

use App\Plugins\PluginManager;
use App\Plugins\Events\PluginEvent;

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

try {
    if (file_exists(APP_DIR . 'storage/packages')) {
        require APP_DIR . 'storage/packages/autoload.php';
    } else {
        throw new Exception('Packages not installed looked at this path: ' . APP_DIR . 'storage/packages');
    }
} catch (Exception $e) {
    echo $e->getMessage();
    echo "\n";
    exit;
}

if (!defined('IS_CLI')) {
    ini_set('expose_php', 'off');
    header_remove('X-Powered-By');
    header_remove('Server');
}

if (!is_writable(__DIR__)) {
    $error = 'Please make sure the root directory is writable.';
    exit(json_encode(['error' => $error, 'code' => 500, 'message' => 'Please make sure the root directory is writable.', 'success' => false]));
}

if (!is_writable(__DIR__ . '/../storage')) {
    exit(json_encode(['error' => 'Please make sure the storage directory is writable.', 'code' => 500, 'message' => 'Please make sure the storage directory is writable.', 'success' => false]));
}

\Sentry\init([
    'dsn' => 'https://b1d78f7281cc4ddb10e693d2a8c3f509@o4508434822791168.ingest.de.sentry.io/4509679592144976',
    // Specify a fixed sample rate
    'traces_sample_rate' => 1.0,

]);

if (file_exists(APP_DIR . 'storage/config/.env')) {
    /**
     * Initialize the plugin manager.
     */
    $pluginManager = new PluginManager();
    $eventManager = $pluginManager->getEventManager();

    /**
     * @global PluginManager $pluginManager
     * @global PluginEvent $eventManager
     */
    global $pluginManager, $eventManager;
}
