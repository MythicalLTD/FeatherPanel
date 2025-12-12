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
use App\Controllers\Wings\Sftp\SftpAuthController;
use App\Controllers\Wings\Backup\WingsBackupController;
use App\Controllers\Wings\Activity\WingsActivityController;
use App\Controllers\Wings\Server\WingsServerInfoController;
use App\Controllers\Wings\Server\WingsServerListController;
use App\Controllers\Wings\Server\WingsImportStatusController;
use App\Controllers\Wings\Server\WingsServersResetController;
use App\Controllers\Wings\Server\WingsServerStatusController;
use App\Controllers\Wings\Server\WingsServerInstallController;
use App\Controllers\Wings\Transfer\WingsTransferStatusController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-remote-servers',
        '/api/remote/servers',
        function (Request $request) {
            return (new WingsServerListController())->getRemoteServers($request);
        },
        ['GET']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-remote-serveres-reset',
        '/api/remote/servers/reset',
        function (Request $request) {
            return (new WingsServersResetController())->resetServers($request);
        },
        ['POST']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-server-config',
        '/api/remote/servers/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            return (new WingsServerInfoController())->getServer($request, $uuid);
        },
        ['GET']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-server-install',
        '/api/remote/servers/{uuid}/install',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            return (new WingsServerInstallController())->getServerInstall($request, $uuid);
        },
        ['GET']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-server-install-done',
        '/api/remote/servers/{uuid}/install',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            return (new WingsServerInstallController())->postServerInstall($request, $uuid);
        },
        ['POST']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-server-status',
        '/api/remote/servers/{uuid}/container/status',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            return (new WingsServerStatusController())->updateContainerStatus($request, $uuid);
        },
        ['POST']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-server-activity',
        '/api/remote/activity',
        function (Request $request) {
            return (new WingsActivityController())->logActivity($request);
        },
        ['POST']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-sftp-auth',
        '/api/remote/sftp/auth',
        function (Request $request) {
            return (new SftpAuthController())->authenticate($request);
        },
        ['POST']
    );

    // Backup-related remote API routes
    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-backup-upload-info',
        '/api/remote/backups/{backupUuid}',
        function (Request $request, array $args) {
            $backupUuid = $args['backupUuid'] ?? null;
            if (!$backupUuid) {
                return ApiResponse::error('Missing backup UUID', 'MISSING_BACKUP_UUID', 400);
            }

            return (new WingsBackupController())->getBackupUploadInfo($request, $backupUuid);
        },
        ['GET']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-backup-completion',
        '/api/remote/backups/{backupUuid}',
        function (Request $request, array $args) {
            $backupUuid = $args['backupUuid'] ?? null;
            if (!$backupUuid) {
                return ApiResponse::error('Missing backup UUID', 'MISSING_BACKUP_UUID', 400);
            }

            return (new WingsBackupController())->reportBackupCompletion($request, $backupUuid);
        },
        ['POST']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-backup-restoration',
        '/api/remote/backups/{backupUuid}/restore',
        function (Request $request, array $args) {
            $backupUuid = $args['backupUuid'] ?? null;
            if (!$backupUuid) {
                return ApiResponse::error('Missing backup UUID', 'MISSING_BACKUP_UUID', 400);
            }

            return (new WingsBackupController())->reportBackupRestoration($request, $backupUuid);
        },
        ['POST']
    );

    // Transfer-related remote API routes
    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-transfer-status',
        '/api/remote/servers/{uuid}/transfer',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            return (new WingsTransferStatusController())->setTransferStatus($request, $uuid);
        },
        ['POST']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-transfer-archive',
        '/api/remote/servers/{uuid}/transfer/archive',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            return (new WingsTransferStatusController())->archiveReceived($request, $uuid);
        },
        ['POST']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-transfer-failure',
        '/api/remote/servers/{uuid}/transfer/failure',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            return (new WingsTransferStatusController())->transferFailure($request, $uuid);
        },
        ['POST']
    );

    // Transfer success endpoint - called by destination Wings when transfer completes successfully
    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-transfer-success',
        '/api/remote/servers/{uuid}/transfer/success',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            return (new WingsTransferStatusController())->transferSuccess($request, $uuid);
        },
        ['POST']
    );

    // Import-related remote API routes
    // Wings calls POST to /import to report status (SetImportStatus callback)
    // Note: Wings may also make GET requests to check endpoint existence
    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-import-status',
        '/api/remote/servers/{uuid}/import',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            $controller = new WingsImportStatusController();

            // Handle GET requests
            if ($request->getMethod() === 'GET') {
                return $controller->handleGetRequest($request, $uuid);
            }

            // Handle POST requests (actual status callback)
            return $controller->setImportStatus($request, $uuid);
        },
        ['GET', 'POST']
    );
};
