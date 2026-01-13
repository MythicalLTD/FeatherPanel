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
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Server\ServerUserController;

return function (RouteCollection $routes): void {

    // Rate limit: Admin can override in ratelimit.json, default is 2 per second
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'session-servers',
        '/api/user/servers',
        function (Request $request) {
            return (new ServerUserController())->getUserServers($request);
        },
        ['GET'],
        Rate::perSecond(2), // Default: Admin can override in ratelimit.json
        'user-servers'
    );

    // Rate limit: Admin can override in ratelimit.json, default is 30 per minute
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-get',
        '/api/user/servers/{uuidShort}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->getServer($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['GET'],
        Rate::perMinute(30) // Default: Admin can override in ratelimit.json
    );

    // Rate limit: Admin can override in ratelimit.json, default is 10 per minute
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-jwt',
        '/api/user/servers/{uuidShort}/jwt',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->generateServerJwt($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST']
    );

    // Rate limit: Admin can override in ratelimit.json, default is 1 per minute
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-update',
        '/api/user/servers/{uuidShort}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->updateServer($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['PUT'],
        Rate::perMinute(2), // Default: Admin can override in ratelimit.json
        'user-server-update'
    );

    // Rate limit: Admin can override in ratelimit.json, default is 1 per hour (very restrictive for deletion)
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-delete',
        '/api/user/servers/{uuidShort}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->deleteServer($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['DELETE'],
        Rate::perHour(1), // Very restrictive rate limit for deletion
        'user-server-delete'
    );

    // Rate limit: Admin can override in ratelimit.json, default is 1 per minute
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-reinstall',
        '/api/user/servers/{uuidShort}/reinstall',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerUserController())->reinstallServer($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST'],
        Rate::perMinute(1) // Default: Admin can override in ratelimit.json
    );

    // Rate limit: Admin can override in ratelimit.json, default is 30 per minute
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-command',
        '/api/user/servers/{uuidShort}/command',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->sendCommand($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST'],
        Rate::perMinute(30) // Default: Admin can override in ratelimit.json
    );
};
