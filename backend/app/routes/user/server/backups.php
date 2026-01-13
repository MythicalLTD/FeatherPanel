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
