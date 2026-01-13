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
use RateLimit\Rate;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Server\Logs\ServerLogsController;

return function (RouteCollection $routes): void {

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-logs',
        '/api/user/servers/{uuidShort}/logs',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerLogsController())->getLogs($request, $uuidShort);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-logs'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-install-logs',
        '/api/user/servers/{uuidShort}/install-logs',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerLogsController())->getInstallLogs($request, $uuidShort);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-logs'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-logs-upload',
        '/api/user/servers/{uuidShort}/logs/upload',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerLogsController())->uploadLogs($request, $uuidShort);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-logs'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-install-logs-upload',
        '/api/user/servers/{uuidShort}/install-logs/upload',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerLogsController())->uploadInstallLogs($request, $uuidShort);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-logs'
    );
};
