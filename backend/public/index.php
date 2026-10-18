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
use App\Runtime\RequestContext;
use App\Telemetry\SentryTelemetry;

/*
 * Classic entry point (php-fpm, FrankenPHP classic mode, PHP built-in server):
 * one PHP request boots the application and handles exactly one HTTP request.
 * FrankenPHP worker mode uses boot/worker.php instead.
 */
$featherpanelStart = microtime(true);

/**
 * @deprecated use App\Runtime\RequestContext::startTime()
 */
define('APP_START', $featherpanelStart);

/**
 * Define the environment path.
 */
require __DIR__ . '/../boot/constants.php';

/**
 * Require the kernel.
 */
require_once APP_DIR . '/boot/kernel.php';
/**
 * Start the APP. with kernel!
 */
try {
    $featherpanelApp = new App(false, false, false, false);
    $featherpanelApp->handle(null, $featherpanelStart);
} catch (Throwable $e) {
    $eventId = SentryTelemetry::captureException($e);
    http_response_code(500);
    header('Content-Type: application/json');
    header('X-Request-ID: ' . RequestContext::id());
    echo json_encode(['success' => false, 'message' => 'Internal server error', 'request_id' => RequestContext::id(), 'event_id' => $eventId]);
}
