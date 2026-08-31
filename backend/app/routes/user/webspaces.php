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
use App\Controllers\User\WebSpaces\WebSpacesController;
use App\Controllers\User\WebSpaces\WebSpaceDnsController;
use App\Controllers\User\WebSpaces\WebSpaceAppsController;
use App\Controllers\User\WebSpaces\WebSpaceLogsController;
use App\Controllers\User\WebSpaces\WebSpaceFilesController;
use App\Controllers\User\WebSpaces\WebSpaceSubuserController;
use App\Controllers\User\WebSpaces\WebSpaceActivityController;
use App\Controllers\User\WebSpaces\WebSpaceAnalyticsController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces',
        '/api/user/webspaces',
        function (Request $request) {
            return (new WebSpacesController())->index($request);
        },
        ['GET'],
        Rate::perSecond(2),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-catalog',
        '/api/user/webspaces/catalog',
        function (Request $request) {
            return (new WebSpacesController())->catalog($request);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-create',
        '/api/user/webspaces/create',
        function (Request $request) {
            return (new WebSpacesController())->create($request);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-order',
        '/api/user/webspaces/order',
        function (Request $request) {
            return (new WebSpacesController())->create($request);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-utilization',
        '/api/user/webspaces/{uuidShort}/utilization',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->utilization($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-transfer-status',
        '/api/user/webspaces/{uuidShort}/transfer/status',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->transferStatus($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-backup-job-status',
        '/api/user/webspaces/{uuidShort}/backups/jobs/{jobId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $jobId = (string) ($args['jobId'] ?? '');
            if ($uuidShort === '' || $jobId === '') {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpacesController())->backupJobStatus($request, $uuidShort, $jobId);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-show',
        '/api/user/webspaces/{uuidShort}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->show($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-infrastructure-readiness',
        '/api/user/webspaces/{uuidShort}/infrastructure-readiness',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->infrastructureReadiness($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-update',
        '/api/user/webspaces/{uuidShort}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->update($request, $uuidShort);
        },
        ['PATCH'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-php-ini',
        '/api/user/webspaces/{uuidShort}/php-ini',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->phpIni($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-php-ini-save',
        '/api/user/webspaces/{uuidShort}/php-ini',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->savePhpIni($request, $uuidShort);
        },
        ['PUT'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-php-extensions',
        '/api/user/webspaces/{uuidShort}/php-extensions',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->phpExtensions($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-php-extensions-save',
        '/api/user/webspaces/{uuidShort}/php-extensions',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->savePhpExtensions($request, $uuidShort);
        },
        ['PUT'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-redis',
        '/api/user/webspaces/{uuidShort}/redis',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->redis($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-redis-save',
        '/api/user/webspaces/{uuidShort}/redis',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->saveRedis($request, $uuidShort);
        },
        ['PUT'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-malware-scan',
        '/api/user/webspaces/{uuidShort}/malware-scan',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->malwareScan($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-malware-scan-status',
        '/api/user/webspaces/{uuidShort}/malware-scan',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->malwareScanStatus($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-malware-scan-schedule',
        '/api/user/webspaces/{uuidShort}/malware-scan/schedule',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->enableMalwareScanSchedule($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-power',
        '/api/user/webspaces/{uuidShort}/power',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->power($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-status',
        '/api/user/webspaces/{uuidShort}/status',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->status($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-logs',
        '/api/user/webspaces/{uuidShort}/logs',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->logs($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-install-logs',
        '/api/user/webspaces/{uuidShort}/logs/install',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->installLogs($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-reinstall',
        '/api/user/webspaces/{uuidShort}/reinstall',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->reinstall($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-install-abort',
        '/api/user/webspaces/{uuidShort}/install/abort',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->abortInstall($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-ssl',
        '/api/user/webspaces/{uuidShort}/ssl',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->ssl($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-ssl-renew',
        '/api/user/webspaces/{uuidShort}/ssl/renew',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->renewSsl($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-dns-check',
        '/api/user/webspaces/{uuidShort}/dns-check',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->checkDns($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-dns-provision',
        '/api/user/webspaces/{uuidShort}/dns/provision',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->provisionDns($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-ssl-custom-status',
        '/api/user/webspaces/{uuidShort}/ssl/custom',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->customSslStatus($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-ssl-custom-upload',
        '/api/user/webspaces/{uuidShort}/ssl/custom',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->uploadCustomSsl($request, $uuidShort);
        },
        ['PUT'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-ssl-custom-delete',
        '/api/user/webspaces/{uuidShort}/ssl/custom',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->deleteCustomSsl($request, $uuidShort);
        },
        ['DELETE'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-backups',
        '/api/user/webspaces/{uuidShort}/backups',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->listBackups($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-backup-create',
        '/api/user/webspaces/{uuidShort}/backup',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->createBackup($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-backup-delete',
        '/api/user/webspaces/{uuidShort}/backups/{backupUuid}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $backupUuid = (string) ($args['backupUuid'] ?? '');
            if ($uuidShort === '' || $backupUuid === '') {
                return ApiResponse::error('Missing uuid', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->deleteBackup($request, $uuidShort, $backupUuid);
        },
        ['DELETE'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-backup-restore',
        '/api/user/webspaces/{uuidShort}/backups/{backupUuid}/restore',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $backupUuid = (string) ($args['backupUuid'] ?? '');
            if ($uuidShort === '' || $backupUuid === '') {
                return ApiResponse::error('Missing uuid', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->restoreBackup($request, $uuidShort, $backupUuid);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-backup-files',
        '/api/user/webspaces/{uuidShort}/backups/{backupUuid}/files',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $backupUuid = (string) ($args['backupUuid'] ?? '');
            if ($uuidShort === '' || $backupUuid === '') {
                return ApiResponse::error('Missing uuid', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->listBackupFiles($request, $uuidShort, $backupUuid);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-backup-download',
        '/api/user/webspaces/{uuidShort}/backups/{backupUuid}/download',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $backupUuid = (string) ($args['backupUuid'] ?? '');
            if ($uuidShort === '' || $backupUuid === '') {
                return ApiResponse::error('Missing uuid', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->downloadBackup($request, $uuidShort, $backupUuid);
        },
        ['GET'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-backup-import',
        '/api/user/webspaces/{uuidShort}/backups/import',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->importBackup($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-jwt',
        '/api/user/webspaces/{uuidShort}/jwt',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpacesController())->generateJwt($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    // --- Files ---
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-file-capabilities',
        '/api/user/webspaces/{uuidShort}/file-capabilities',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->fileCapabilities($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-list',
        '/api/user/webspaces/{uuidShort}/files/list',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->list($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-contents',
        '/api/user/webspaces/{uuidShort}/files/contents',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->contents($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-write',
        '/api/user/webspaces/{uuidShort}/files/write',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->write($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-create-directory',
        '/api/user/webspaces/{uuidShort}/files/create-directory',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->createDirectory($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-rename',
        '/api/user/webspaces/{uuidShort}/files/rename',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->rename($request, $uuidShort);
        },
        ['PUT'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-copy',
        '/api/user/webspaces/{uuidShort}/files/copy',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->copy($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-copy-many',
        '/api/user/webspaces/{uuidShort}/files/copy-many',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->copyMany($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-create-symlink',
        '/api/user/webspaces/{uuidShort}/files/create-symlink',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->createSymlink($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-fingerprints',
        '/api/user/webspaces/{uuidShort}/files/fingerprints',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->fingerprints($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-delete',
        '/api/user/webspaces/{uuidShort}/files/delete',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->delete($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-compress',
        '/api/user/webspaces/{uuidShort}/files/compress',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->compress($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-decompress',
        '/api/user/webspaces/{uuidShort}/files/decompress',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->decompress($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-chmod',
        '/api/user/webspaces/{uuidShort}/files/chmod',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->chmod($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-search',
        '/api/user/webspaces/{uuidShort}/files/search',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->search($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-pull',
        '/api/user/webspaces/{uuidShort}/files/pull',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->pull($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-download',
        '/api/user/webspaces/{uuidShort}/files/download',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->download($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-upload',
        '/api/user/webspaces/{uuidShort}/files/upload',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceFilesController())->upload($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-trash-list',
        '/api/user/webspaces/{uuidShort}/files/trash',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->listTrash($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-trash-restore',
        '/api/user/webspaces/{uuidShort}/files/trash/restore',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->restoreTrash($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-trash-delete',
        '/api/user/webspaces/{uuidShort}/files/trash/delete',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->deleteTrash($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-trash-empty',
        '/api/user/webspaces/{uuidShort}/files/trash/empty',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->emptyTrash($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-download-directory',
        '/api/user/webspaces/{uuidShort}/files/download-directory',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->downloadDirectory($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-archive-list',
        '/api/user/webspaces/{uuidShort}/files/archive-list',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->listArchive($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-extract-archive',
        '/api/user/webspaces/{uuidShort}/files/extract-archive-selection',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->extractArchiveSelection($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-search-advanced',
        '/api/user/webspaces/{uuidShort}/files/search-advanced',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->searchAdvanced($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-wipe',
        '/api/user/webspaces/{uuidShort}/files/wipe',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->wipeAll($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-upload-url',
        '/api/user/webspaces/{uuidShort}/files/upload-url',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->getUploadUrl($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-share',
        '/api/user/webspaces/{uuidShort}/files/share',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->shareFile($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-share-jobs',
        '/api/user/webspaces/{uuidShort}/files/share-jobs',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->getShareJobs($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-share-jobs-delete',
        '/api/user/webspaces/{uuidShort}/files/share-jobs/{shareId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $shareId = (string) ($args['shareId'] ?? '');

            return (new WebSpaceFilesController())->deleteShareJob($request, $uuidShort, $shareId);
        },
        ['DELETE'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-pull-jobs',
        '/api/user/webspaces/{uuidShort}/files/pull-jobs',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return (new WebSpaceFilesController())->listPullJobs($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-files-pull-jobs-delete',
        '/api/user/webspaces/{uuidShort}/files/pull-jobs/{identifier}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $identifier = (string) ($args['identifier'] ?? '');

            return (new WebSpaceFilesController())->cancelPullJob($request, $uuidShort, $identifier);
        },
        ['DELETE'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    // --- Subusers ---
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-users',
        '/api/user/webspaces/{uuidShort}/users',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceSubuserController())->index($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-users-create',
        '/api/user/webspaces/{uuidShort}/users',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceSubuserController())->create($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-users-update',
        '/api/user/webspaces/{uuidShort}/users/{subuserId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $subuserId = (int) ($args['subuserId'] ?? 0);
            if ($uuidShort === '' || $subuserId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceSubuserController())->update($request, $uuidShort, $subuserId);
        },
        ['PUT'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-users-delete',
        '/api/user/webspaces/{uuidShort}/users/{subuserId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $subuserId = (int) ($args['subuserId'] ?? 0);
            if ($uuidShort === '' || $subuserId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceSubuserController())->delete($request, $uuidShort, $subuserId);
        },
        ['DELETE'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-activities',
        '/api/user/webspaces/{uuidShort}/activities',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceActivityController())->index($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-dns-zones',
        '/api/user/webspaces/{uuidShort}/dns/zones',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceDnsController())->listZones($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-dns-hosts',
        '/api/user/webspaces/{uuidShort}/dns/hosts',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceDnsController())->listDnsHosts($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-dns-zones-link',
        '/api/user/webspaces/{uuidShort}/dns/zones',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceDnsController())->linkZone($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-dns-zones-unlink',
        '/api/user/webspaces/{uuidShort}/dns/zones/{zoneId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $zoneId = $args['zoneId'] ?? null;
            if ($uuidShort === '' || !$zoneId || !is_numeric($zoneId)) {
                return ApiResponse::error('Missing uuidShort or zone ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceDnsController())->unlinkZone($request, $uuidShort, (int) $zoneId);
        },
        ['DELETE'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-dns-records',
        '/api/user/webspaces/{uuidShort}/dns/zones/{zoneId}/records',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $zoneId = $args['zoneId'] ?? null;
            if ($uuidShort === '' || !$zoneId || !is_numeric($zoneId)) {
                return ApiResponse::error('Missing uuidShort or zone ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceDnsController())->listRecords($request, $uuidShort, (int) $zoneId);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-dns-records-create',
        '/api/user/webspaces/{uuidShort}/dns/zones/{zoneId}/records',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $zoneId = $args['zoneId'] ?? null;
            if ($uuidShort === '' || !$zoneId || !is_numeric($zoneId)) {
                return ApiResponse::error('Missing uuidShort or zone ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceDnsController())->createRecord($request, $uuidShort, (int) $zoneId);
        },
        ['POST'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-dns-records-update',
        '/api/user/webspaces/{uuidShort}/dns/zones/{zoneId}/records/{recordId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $zoneId = $args['zoneId'] ?? null;
            $recordId = (string) ($args['recordId'] ?? '');
            if ($uuidShort === '' || !$zoneId || !is_numeric($zoneId) || $recordId === '') {
                return ApiResponse::error('Missing uuidShort, zone ID, or record ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceDnsController())->updateRecord($request, $uuidShort, (int) $zoneId, $recordId);
        },
        ['PATCH'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-dns-records-delete',
        '/api/user/webspaces/{uuidShort}/dns/zones/{zoneId}/records/{recordId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $zoneId = $args['zoneId'] ?? null;
            $recordId = (string) ($args['recordId'] ?? '');
            if ($uuidShort === '' || !$zoneId || !is_numeric($zoneId) || $recordId === '') {
                return ApiResponse::error('Missing uuidShort, zone ID, or record ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceDnsController())->deleteRecord($request, $uuidShort, (int) $zoneId, $recordId);
        },
        ['DELETE'],
        Rate::perMinute(20),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-proxy-logs',
        '/api/user/webspaces/{uuidShort}/proxy-logs',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceLogsController())->proxyLogs($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-proxy-logs-rotate',
        '/api/user/webspaces/{uuidShort}/proxy-logs/rotate',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceLogsController())->rotateProxyLogs($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-analytics',
        '/api/user/webspaces/{uuidShort}/analytics',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAnalyticsController())->summary($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-wordpress',
        '/api/user/webspaces/{uuidShort}/apps/wordpress',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->installWordPress($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-wordpress-update',
        '/api/user/webspaces/{uuidShort}/apps/wordpress/update',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->updateWordPress($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-wordpress-staging',
        '/api/user/webspaces/{uuidShort}/apps/wordpress/staging',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->stagingWordPress($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-wordpress-staging-promote',
        '/api/user/webspaces/{uuidShort}/apps/wordpress/staging/promote',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->promoteWordPressStaging($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-laravel',
        '/api/user/webspaces/{uuidShort}/apps/laravel',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->installLaravel($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-joomla',
        '/api/user/webspaces/{uuidShort}/apps/joomla',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->installJoomla($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-drupal',
        '/api/user/webspaces/{uuidShort}/apps/drupal',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->installDrupal($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-prestashop',
        '/api/user/webspaces/{uuidShort}/apps/prestashop',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->installPrestaShop($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-magento',
        '/api/user/webspaces/{uuidShort}/apps/magento',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->installMagento($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-ghost',
        '/api/user/webspaces/{uuidShort}/apps/ghost',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->installGhost($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-node-starter',
        '/api/user/webspaces/{uuidShort}/apps/node-starter',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->installNodeStarter($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-python-starter',
        '/api/user/webspaces/{uuidShort}/apps/python-starter',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->installPythonStarter($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-wordpress-plugin',
        '/api/user/webspaces/{uuidShort}/apps/wordpress/plugin',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->installWordPressPlugin($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-wordpress-auto-update',
        '/api/user/webspaces/{uuidShort}/apps/wordpress/auto-update',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->enableWordPressAutoUpdate($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-git-deploy',
        '/api/user/webspaces/{uuidShort}/apps/git-deploy',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->gitDeploy($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-git-webhook',
        '/api/user/webspaces/{uuidShort}/apps/git-webhook',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->gitWebhookConfig($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-git-webhook-save',
        '/api/user/webspaces/{uuidShort}/apps/git-webhook',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->saveGitWebhookConfig($request, $uuidShort);
        },
        ['PUT'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-git-deploy-key',
        '/api/user/webspaces/{uuidShort}/apps/git-deploy-key',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->gitDeployKey($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-apps-git-deploy-key-regenerate',
        '/api/user/webspaces/{uuidShort}/apps/git-deploy-key',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_ID', 400);
            }

            return (new WebSpaceAppsController())->regenerateGitDeployKey($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces'
    );
};
