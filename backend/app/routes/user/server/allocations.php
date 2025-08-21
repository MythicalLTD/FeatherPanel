<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

use App\App;
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
        ['GET']
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
        ['DELETE']
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
        ['POST']
    );

    // Auto-allocate free allocations to server
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-auto-allocate',
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
        ['POST']
    );
};
