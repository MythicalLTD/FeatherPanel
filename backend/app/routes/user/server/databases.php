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
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-databases'
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
        ['POST'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-server-databases'
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
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-databases'
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
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-databases'
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
        ['PATCH'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-databases'
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
        ['POST'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-server-databases'
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
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-databases'
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
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-databases'
    );
};
