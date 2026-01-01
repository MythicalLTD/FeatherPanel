<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
