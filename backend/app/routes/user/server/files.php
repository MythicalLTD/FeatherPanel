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
use App\Controllers\User\Server\Files\ServerFilesController;

return function (RouteCollection $routes): void {

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-files',
        '/api/user/servers/{uuidShort}/files',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerFilesController())->getFiles($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-server-files'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-file',
        '/api/user/servers/{uuidShort}/file',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerFilesController())->getFile($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-server-files'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-write-file',
        '/api/user/servers/{uuidShort}/write-file',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->writeFile($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-rename',
        '/api/user/servers/{uuidShort}/rename',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->renameFileOrFolder($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['PUT']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-delete-files',
        '/api/user/servers/{uuidShort}/delete-files',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->deleteFiles($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['DELETE'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-files'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-wipe-all-files',
        '/api/user/servers/{uuidShort}/wipe-all-files',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->wipeAllFiles($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST'],
        Rate::perMinute(2), // Lower rate limit for destructive action
        'user-server-files'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-copy-files',
        '/api/user/servers/{uuidShort}/copy-files',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->copyFiles($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-create-directory',
        '/api/user/servers/{uuidShort}/create-directory',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->createDirectory($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-files'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-compress-files',
        '/api/user/servers/{uuidShort}/compress-files',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->compressFiles($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-server-files'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-decompress-archive',
        '/api/user/servers/{uuidShort}/decompress-archive',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->decompressArchive($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST'],
        Rate::perMinute(20), // Default: Admin can override in ratelimit.json
        'user-server-files'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-change-permissions',
        '/api/user/servers/{uuidShort}/change-permissions',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->changeFilePermissions($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-server-files'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-pull-file',
        '/api/user/servers/{uuidShort}/pull-file',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->pullFile($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-downloads-list',
        '/api/user/servers/{uuidShort}/downloads-list',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->getDownloadsList($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-files'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-delete-pull-process',
        '/api/user/servers/{uuidShort}/delete-pull-process/{pullId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $pullId = $args['pullId'] ?? null;

            if (!$pullId) {
                return ApiResponse::error('Missing pull process ID', 'MISSING_PULL_ID', 400);
            }

            return (new ServerFilesController())->deletePullProcess($request, $uuidShort, $pullId);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['DELETE'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-files'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-upload-file',
        '/api/user/servers/{uuidShort}/upload-file',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->uploadFile($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-files'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-download-file',
        '/api/user/servers/{uuidShort}/download-file',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerFilesController())->downloadFile($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['GET'],
        Rate::perMinute(20), // Default: Admin can override in ratelimit.json
        'user-server-files'
    );
};
