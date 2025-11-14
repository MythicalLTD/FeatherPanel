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

use App\App;
use App\Permissions;
use App\Helpers\ApiResponse;
use App\Controllers\Admin\TISController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    // Get TIS statistics
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-tis-stats',
        '/api/admin/tis/stats',
        function (Request $request) {
            return (new TISController())->getStats($request);
        },
        Permissions::ADMIN_TIS_VIEW,
    );

    // Get confirmed malicious hashes
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-tis-hashes',
        '/api/admin/tis/hashes',
        function (Request $request) {
            return (new TISController())->getHashes($request);
        },
        Permissions::ADMIN_TIS_VIEW,
    );

    // Check server status
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-tis-server-check',
        '/api/admin/tis/servers/{serverUuid}',
        function (Request $request, array $args) {
            $serverUuid = $args['serverUuid'] ?? null;
            if (!$serverUuid || !is_string($serverUuid)) {
                return ApiResponse::error('Missing or invalid server UUID', 'INVALID_SERVER_UUID', 400);
            }

            return (new TISController())->checkServer($request, $serverUuid);
        },
        Permissions::ADMIN_TIS_VIEW,
    );

    // Check hashes against TIS
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-tis-check-hashes',
        '/api/admin/tis/check/hashes',
        function (Request $request) {
            return (new TISController())->checkHashes($request);
        },
        Permissions::ADMIN_TIS_VIEW,
        ['POST'],
    );
};
