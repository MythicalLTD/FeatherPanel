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
        ['GET']
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
        ['GET']
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
        ['DELETE']
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
        ['POST']
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
        ['POST']
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
        ['POST']
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
        ['POST']
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
        ['GET']
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
        ['DELETE']
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
        ['POST']
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
        ['GET']
    );
};
