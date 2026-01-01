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
use App\Controllers\User\Server\ServerBackupController;

return function (RouteCollection $routes): void {

    // Backup-related routes
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-backups',
        '/api/user/servers/{uuidShort}/backups',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerBackupController())->getBackups($request, $server['uuid']);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-backups'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-create-backup',
        '/api/user/servers/{uuidShort}/backups',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerBackupController())->createBackup($request, $server['uuid']);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(2), // Default: Admin can override in ratelimit.json
        'user-server-backups'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-get-backup',
        '/api/user/servers/{uuidShort}/backups/{backupUuid}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $backupUuid = $args['backupUuid'] ?? null;
            if (!$uuidShort || !$backupUuid) {
                return ApiResponse::error('Missing or invalid UUID short or backup UUID', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerBackupController())->getBackup($request, $server['uuid'], $backupUuid);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-backups'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-restore-backup',
        '/api/user/servers/{uuidShort}/backups/{backupUuid}/restore',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $backupUuid = $args['backupUuid'] ?? null;
            if (!$uuidShort || !$backupUuid) {
                return ApiResponse::error('Missing or invalid UUID short or backup UUID', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerBackupController())->restoreBackup($request, $server['uuid'], $backupUuid);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(1), // Default: Admin can override in ratelimit.json
        'user-server-backups'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-delete-backup',
        '/api/user/servers/{uuidShort}/backups/{backupUuid}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $backupUuid = $args['backupUuid'] ?? null;
            if (!$uuidShort || !$backupUuid) {
                return ApiResponse::error('Missing or invalid UUID short or backup UUID', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerBackupController())->deleteBackup($request, $server['uuid'], $backupUuid);
        },
        'uuidShort',
        ['DELETE'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-backups'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-backup-download',
        '/api/user/servers/{uuidShort}/backups/{backupUuid}/download',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $backupUuid = $args['backupUuid'] ?? null;
            if (!$uuidShort || !$backupUuid) {
                return ApiResponse::error('Missing or invalid UUID short or backup UUID', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerBackupController())->getBackupDownloadUrl($request, $server['uuid'], $backupUuid);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-backups'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-backup-lock',
        '/api/user/servers/{uuidShort}/backups/{backupUuid}/lock',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $backupUuid = $args['backupUuid'] ?? null;
            if (!$uuidShort || !$backupUuid) {
                return ApiResponse::error('Missing or invalid UUID short or backup UUID', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerBackupController())->lockBackup($request, $server['uuid'], $backupUuid);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-backups'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-backup-unlock',
        '/api/user/servers/{uuidShort}/backups/{backupUuid}/unlock',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $backupUuid = $args['backupUuid'] ?? null;
            if (!$uuidShort || !$backupUuid) {
                return ApiResponse::error('Missing or invalid UUID short or backup UUID', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerBackupController())->unlockBackup($request, $server['uuid'], $backupUuid);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-backups'
    );
};
