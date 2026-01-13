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

    // Get all subusers for a server
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-subusers',
        '/api/user/servers/{uuidShort}/subusers',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\SubuserController())->getSubusers($request, $server['uuid']);
        },
        'uuidShort',
        ['GET']
    );

    // Create a new subuser
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-create-subuser',
        '/api/user/servers/{uuidShort}/subusers',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\SubuserController())->createSubuser($request, $server['uuid']);
        },
        'uuidShort',
        ['POST']
    );

    // Get valid permissions (MUST be before parameterized routes)
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-get-valid-permissions',
        '/api/user/servers/{uuidShort}/subusers/permissions',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\SubuserController())->getValidPermissions($request, $server['uuid']);
        },
        'uuidShort',
        ['GET']
    );

    // Get all subusers with details (MUST be before parameterized routes)
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-get-subusers-details',
        '/api/user/servers/{uuidShort}/subusers/details',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\SubuserController())->getSubusersWithDetails($request, $server['uuid']);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-subusers'
    );

    // Search for users to add as subusers (MUST be before parameterized routes)
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-search-users',
        '/api/user/servers/{uuidShort}/subusers/search-users',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\SubuserController())->searchUsers($request, $server['uuid']);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-subusers'
    );

    // Get a specific subuser
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-get-subuser',
        '/api/user/servers/{uuidShort}/subusers/{subuserId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $subuserId = $args['subuserId'] ?? null;
            if (!$uuidShort || !$subuserId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\SubuserController())->getSubuser($request, $server['uuid'], (int) $subuserId);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-subusers'
    );

    // Delete a subuser
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-delete-subuser',
        '/api/user/servers/{uuidShort}/subusers/{subuserId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $subuserId = $args['subuserId'] ?? null;
            if (!$uuidShort || !$subuserId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\SubuserController())->deleteSubuser($request, $server['uuid'], (int) $subuserId);
        },
        'uuidShort',
        ['DELETE']
    );

    // Get subuser with details
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-get-subuser-details',
        '/api/user/servers/{uuidShort}/subusers/{subuserId}/details',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $subuserId = $args['subuserId'] ?? null;
            if (!$uuidShort || !$subuserId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\SubuserController())->getSubuserWithDetails($request, $server['uuid'], (int) $subuserId);
        },
        'uuidShort',
        ['GET']
    );

    // Update subuser
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-update-subuser',
        '/api/user/servers/{uuidShort}/subusers/{subuserId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $subuserId = $args['subuserId'] ?? null;
            if (!$uuidShort || !$subuserId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\SubuserController())->updateSubuser($request, $server['uuid'], (int) $subuserId);
        },
        'uuidShort',
        ['PATCH'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-subusers'
    );
};
