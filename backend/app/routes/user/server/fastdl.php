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
use App\Controllers\User\Server\ServerFastDlController;

return function (RouteCollection $routes): void {
    // Get FastDL configuration
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-fastdl-get',
        '/api/user/servers/{uuidShort}/fastdl',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerFastDlController())->getFastDl($request, (int) $server['id']);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-fastdl'
    );

    // Enable FastDL
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-fastdl-enable',
        '/api/user/servers/{uuidShort}/fastdl/enable',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerFastDlController())->enableFastDl($request, (int) $server['id']);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-fastdl'
    );

    // Disable FastDL
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-fastdl-disable',
        '/api/user/servers/{uuidShort}/fastdl/disable',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerFastDlController())->disableFastDl($request, (int) $server['id']);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-fastdl'
    );

    // Update FastDL configuration
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-fastdl-update',
        '/api/user/servers/{uuidShort}/fastdl',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerFastDlController())->updateFastDl($request, (int) $server['id']);
        },
        'uuidShort',
        ['PUT'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-fastdl'
    );
};
