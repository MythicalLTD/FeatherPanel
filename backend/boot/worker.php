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
use App\Runtime\WorkerRestart;
use App\Runtime\RequestContext;
use App\Telemetry\SentryTelemetry;

/*
 * FrankenPHP worker entry point.
 *
 * Boots the application once and then serves requests in a loop
 * (https://frankenphp.dev/docs/worker/). Enabled by FEATHERPANEL_WORKER_MODE=true
 * in the Docker images; public/index.php stays the classic entry point.
 *
 * Between requests the loop collects garbage and exits (FrankenPHP then starts
 * a fresh copy) when:
 *  - FEATHERPANEL_WORKER_MAX_REQUESTS requests were served (memory-leak safety net),
 *  - a plugin install/update/remove or a .env/rate-limit change asked for a
 *    reload (see App\Runtime\WorkerRestart).
 */
if (!function_exists('frankenphp_handle_request')) {
    fwrite(STDERR, "boot/worker.php must run as a FrankenPHP worker script.\n");
    exit(1);
}

$featherpanelBootTime = microtime(true);

// Read before the first request: afterwards $_SERVER holds the request's values.
$featherpanelMaxRequests = $_SERVER['FEATHERPANEL_WORKER_MAX_REQUESTS'] ?? getenv('FEATHERPANEL_WORKER_MAX_REQUESTS');
$featherpanelMaxRequests = ($featherpanelMaxRequests === false || $featherpanelMaxRequests === '') ? 1000 : (int) $featherpanelMaxRequests; // 0 = unlimited

/**
 * @deprecated boot time of the worker, not of the request; use App\Runtime\RequestContext::startTime()
 */
define('APP_START', $featherpanelBootTime);

require __DIR__ . '/constants.php';
require_once APP_DIR . '/boot/kernel.php';

// Boot once. When the database is unreachable the boot is retried on the next request.
$featherpanelApp = new App(false, false, false, false);
WorkerRestart::markWorkerBoot($featherpanelBootTime);

$featherpanelHandler = static function () use ($featherpanelApp): void {
    try {
        $featherpanelApp->handle();
    } catch (Throwable $e) {
        // set_exception_handler() only runs when the worker script ends, so
        // anything that escaped App::handle() is answered here.
        $eventId = SentryTelemetry::captureException($e);
        error_log('Unhandled exception in FrankenPHP worker: ' . $e->getMessage());
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json');
            header('X-Request-ID: ' . RequestContext::id());
        }
        echo json_encode([
            'success' => false,
            'message' => 'Internal server error',
            'request_id' => RequestContext::id(),
            'event_id' => $eventId,
        ]);
    }
};

for ($featherpanelServed = 0; $featherpanelMaxRequests <= 0 || $featherpanelServed < $featherpanelMaxRequests; ++$featherpanelServed) {
    $featherpanelKeepRunning = frankenphp_handle_request($featherpanelHandler);

    // Collect cycles between requests rather than in the middle of one.
    gc_collect_cycles();

    if (!$featherpanelKeepRunning || WorkerRestart::isRestartRequested()) {
        break;
    }
}
