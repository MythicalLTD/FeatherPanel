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
use App\Permissions;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\FeatherZeroTrustController;

return function (RouteCollection $routes): void {
    // Get configuration
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-config',
        '/api/admin/featherzerotrust/config',
        function (Request $request) {
            return (new FeatherZeroTrustController())->getConfig($request);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_CONFIGURE,
    );

    // Update configuration
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-config-update',
        '/api/admin/featherzerotrust/config',
        function (Request $request) {
            return (new FeatherZeroTrustController())->updateConfig($request);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_CONFIGURE,
        ['PUT'],
    );

    // Scan a single server
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-scan',
        '/api/admin/featherzerotrust/scan',
        function (Request $request) {
            return (new FeatherZeroTrustController())->scanServer($request);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_SCAN,
        ['POST'],
    );

    // Scan multiple servers (batch)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-scan-batch',
        '/api/admin/featherzerotrust/scan/batch',
        function (Request $request) {
            return (new FeatherZeroTrustController())->scanBatch($request);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_SCAN,
        ['POST'],
    );

    // Get cron execution logs
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-logs',
        '/api/admin/featherzerotrust/logs',
        function (Request $request) {
            return (new FeatherZeroTrustController())->getCronLogs($request);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_VIEW,
    );

    // Get detailed cron execution log
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-logs-details',
        '/api/admin/featherzerotrust/logs/{executionId}',
        function (Request $request, array $args) {
            $executionId = $args['executionId'] ?? null;
            if (!$executionId || !is_string($executionId)) {
                return ApiResponse::error('Missing or invalid execution ID', 'INVALID_EXECUTION_ID', 400);
            }

            return (new FeatherZeroTrustController())->getCronLogDetails($request, $executionId);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_VIEW,
    );

    // Get suspicious file hashes
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-hashes',
        '/api/admin/featherzerotrust/hashes',
        function (Request $request) {
            return (new FeatherZeroTrustController())->getHashes($request);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_VIEW,
    );

    // Get hash statistics
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-hashes-stats',
        '/api/admin/featherzerotrust/hashes/stats',
        function (Request $request) {
            return (new FeatherZeroTrustController())->getHashStats($request);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_VIEW,
    );

    // Check hashes against database
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-hashes-check',
        '/api/admin/featherzerotrust/hashes/check',
        function (Request $request) {
            return (new FeatherZeroTrustController())->checkHashes($request);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_VIEW,
        ['POST'],
    );

    // Add hash manually
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-hashes-add',
        '/api/admin/featherzerotrust/hashes',
        function (Request $request) {
            return (new FeatherZeroTrustController())->addHash($request);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_MANAGE,
        ['POST'],
    );

    // Confirm hash as malicious
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-hashes-confirm',
        '/api/admin/featherzerotrust/hashes/{hash}/confirm',
        function (Request $request, array $args) {
            $hash = $args['hash'] ?? null;
            if (!$hash || !is_string($hash)) {
                return ApiResponse::error('Missing or invalid hash', 'INVALID_HASH', 400);
            }

            return (new FeatherZeroTrustController())->confirmHash($request, $hash);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_MANAGE,
        ['PUT'],
    );

    // Bulk confirm hashes
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-hashes-bulk-confirm',
        '/api/admin/featherzerotrust/hashes/bulk/confirm',
        function (Request $request) {
            return (new FeatherZeroTrustController())->bulkConfirmHashes($request);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_MANAGE,
        ['POST'],
    );

    // Bulk delete hashes
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-hashes-bulk-delete',
        '/api/admin/featherzerotrust/hashes/bulk/delete',
        function (Request $request) {
            return (new FeatherZeroTrustController())->bulkDeleteHashes($request);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_MANAGE,
        ['POST'],
    );

    // Delete hash
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-featherzerotrust-hashes-delete',
        '/api/admin/featherzerotrust/hashes/{hash}',
        function (Request $request, array $args) {
            $hash = $args['hash'] ?? null;
            if (!$hash || !is_string($hash)) {
                return ApiResponse::error('Missing or invalid hash', 'INVALID_HASH', 400);
            }

            return (new FeatherZeroTrustController())->deleteHash($request, $hash);
        },
        Permissions::ADMIN_FEATHERZEROTRUST_MANAGE,
        ['DELETE'],
    );
};
