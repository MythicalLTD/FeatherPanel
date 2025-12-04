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
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Server\ServerDatabaseController;

return function (RouteCollection $routes): void {
    // Get all databases for a server
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-databases',
        '/api/user/servers/{uuidShort}/databases',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerDatabaseController())->getServerDatabases($request, $server['uuid']);
        },
        'uuidShort',
        ['GET']
    );

    // Create a new database for a server
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-databases-create',
        '/api/user/servers/{uuidShort}/databases',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerDatabaseController())->createServerDatabase($request, $server['uuid']);
        },
        'uuidShort',
        ['POST']
    );

    // Get available database hosts for a server (MUST be before {databaseId} routes)
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-databases-hosts',
        '/api/user/servers/{uuidShort}/databases/hosts',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerDatabaseController())->getAvailableDatabaseHosts($request, $server['uuid']);
        },
        'uuidShort',
        ['GET']
    );

    // Get a specific database for a server
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-databases-show',
        '/api/user/servers/{uuidShort}/databases/{databaseId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            $databaseId = $args['databaseId'] ?? null;
            if (!$databaseId || !is_numeric($databaseId)) {
                return ApiResponse::error('Missing or invalid database ID', 'INVALID_DATABASE_ID', 400);
            }

            return (new ServerDatabaseController())->getServerDatabase($request, $server['uuid'], (int) $databaseId);
        },
        'uuidShort',
        ['GET']
    );

    // Update a database for a server
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-databases-update',
        '/api/user/servers/{uuidShort}/databases/{databaseId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            $databaseId = $args['databaseId'] ?? null;
            if (!$databaseId || !is_numeric($databaseId)) {
                return ApiResponse::error('Missing or invalid database ID', 'INVALID_DATABASE_ID', 400);
            }

            return (new ServerDatabaseController())->updateServerDatabase($request, $server['uuid'], (int) $databaseId);
        },
        'uuidShort',
        ['PATCH']
    );

    // Delete a database for a server
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-databases-delete',
        '/api/user/servers/{uuidShort}/databases/{databaseId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            $databaseId = $args['databaseId'] ?? null;
            if (!$databaseId || !is_numeric($databaseId)) {
                return ApiResponse::error('Missing or invalid database ID', 'INVALID_DATABASE_ID', 400);
            }

            return (new ServerDatabaseController())->deleteServerDatabase($request, $server['uuid'], (int) $databaseId);
        },
        'uuidShort',
        ['DELETE']
    );

    // Test connection to a database host
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-databases-test-host',
        '/api/user/servers/{uuidShort}/databases/hosts/{databaseHostId}/test',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            $databaseHostId = $args['databaseHostId'] ?? null;
            if (!$databaseHostId || !is_numeric($databaseHostId)) {
                return ApiResponse::error('Missing or invalid database host ID', 'INVALID_DATABASE_HOST_ID', 400);
            }

            return (new ServerDatabaseController())->testDatabaseHostConnection($request, $server['uuid'], (int) $databaseHostId);
        },
        'uuidShort',
        ['POST']
    );

    // Check if phpMyAdmin is installed
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-databases-phpmyadmin-check',
        '/api/user/servers/{uuidShort}/databases/phpmyadmin/check',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerDatabaseController())->checkPhpMyAdminInstalled($request, $server['uuid']);
        },
        'uuidShort',
        ['GET']
    );

    // Generate phpMyAdmin signon token
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-databases-phpmyadmin-token',
        '/api/user/servers/{uuidShort}/databases/{databaseId}/phpmyadmin/token',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $databaseId = $args['databaseId'] ?? null;
            if (!$uuidShort || !$databaseId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerDatabaseController())->generatePhpMyAdminToken($request, $server['uuid'], (int) $databaseId);
        },
        'uuidShort',
        ['POST']
    );
};
