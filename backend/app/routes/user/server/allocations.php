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

return function (RouteCollection $routes): void {

    // Server allocations
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-allocations',
        '/api/user/servers/{uuidShort}/allocations',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\ServerAllocationController())->getServerAllocations($request, (int) $server['id']);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-allocations'
    );

    // Delete allocation from server
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-delete-allocation',
        '/api/user/servers/{uuidShort}/allocations/{allocationId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $allocationId = $args['allocationId'] ?? null;
            if (!$uuidShort || !$allocationId) {
                return ApiResponse::error('Missing or invalid UUID short or allocation ID', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\ServerAllocationController())->deleteAllocation($request, (int) $server['id'], (int) $allocationId);
        },
        'uuidShort',
        ['DELETE'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-allocations'
    );

    // Set allocation as primary
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-set-primary-allocation',
        '/api/user/servers/{uuidShort}/allocations/{allocationId}/primary',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $allocationId = $args['allocationId'] ?? null;
            if (!$uuidShort || !$allocationId) {
                return ApiResponse::error('Missing or invalid UUID short or allocation ID', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\ServerAllocationController())->setPrimaryAllocation($request, (int) $server['id'], (int) $allocationId);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-server-allocations'
    );

    // Get available allocations for selection
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-available-allocations',
        '/api/user/servers/{uuidShort}/allocations/available',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\ServerAllocationController())->getAvailableAllocations($request, (int) $server['id']);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-allocations'
    );

    // Auto-allocate free allocations to server

    // Auto-allocate free allocations to server
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-allocations-auto',
        '/api/user/servers/{uuidShort}/allocations/auto',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\ServerAllocationController())->autoAllocate($request, (int) $server['id']);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-server-allocations'
    );
};
