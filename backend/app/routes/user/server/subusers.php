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
