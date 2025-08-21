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
        ['GET']
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
        ['POST']
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
        ['GET']
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
        ['POST']
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
        ['DELETE']
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
        ['GET']
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
        ['POST']
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
        ['POST']
    );
};
