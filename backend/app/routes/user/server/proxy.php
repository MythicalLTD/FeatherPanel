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
use App\Chat\Server;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Server\ServerProxyController;

return function (RouteCollection $routes): void {
    // List proxies
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-proxy-list',
        '/api/user/servers/{uuidShort}/proxy',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerProxyController())->listProxies($request, (int) $server['id']);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30),
        'user-server-proxy'
    );

    // Create proxy
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-proxy-create',
        '/api/user/servers/{uuidShort}/proxy/create',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerProxyController())->createProxy($request, (int) $server['id']);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-proxy'
    );

    // Delete proxy
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-proxy-delete',
        '/api/user/servers/{uuidShort}/proxy/delete',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerProxyController())->deleteProxy($request, (int) $server['id']);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-proxy'
    );

    // Verify DNS
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-proxy-verify-dns',
        '/api/user/servers/{uuidShort}/proxy/verify-dns',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerProxyController())->verifyDns($request, (int) $server['id']);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(20), // More frequent for verification
        'user-server-proxy'
    );
};
