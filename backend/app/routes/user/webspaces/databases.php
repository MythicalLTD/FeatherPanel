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
use App\Controllers\User\WebSpaces\WebSpaceDatabaseController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-databases',
        '/api/user/webspaces/{uuidShort}/databases',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceDatabaseController())->index($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-databases-hosts',
        '/api/user/webspaces/{uuidShort}/databases/hosts',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceDatabaseController())->hosts($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-databases-create',
        '/api/user/webspaces/{uuidShort}/databases',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceDatabaseController())->create($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-databases-delete',
        '/api/user/webspaces/{uuidShort}/databases/{databaseId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $databaseId = (int) ($args['databaseId'] ?? 0);
            if ($uuidShort === '' || $databaseId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceDatabaseController())->delete($request, $uuidShort, $databaseId);
        },
        ['DELETE'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-databases-reset-password',
        '/api/user/webspaces/{uuidShort}/databases/{databaseId}/reset-password',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $databaseId = (int) ($args['databaseId'] ?? 0);
            if ($uuidShort === '' || $databaseId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceDatabaseController())->resetPassword($request, $uuidShort, $databaseId);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-databases-dump',
        '/api/user/webspaces/{uuidShort}/databases/{databaseId}/dump',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $databaseId = (int) ($args['databaseId'] ?? 0);
            if ($uuidShort === '' || $databaseId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceDatabaseController())->dump($request, $uuidShort, $databaseId);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-databases-restore',
        '/api/user/webspaces/{uuidShort}/databases/{databaseId}/restore',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $databaseId = (int) ($args['databaseId'] ?? 0);
            if ($uuidShort === '' || $databaseId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceDatabaseController())->restoreDump($request, $uuidShort, $databaseId);
        },
        ['POST'],
        Rate::perMinute(5),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-databases-phpmyadmin-check',
        '/api/user/webspaces/{uuidShort}/databases/phpmyadmin/check',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceDatabaseController())->checkPhpMyAdminInstalled($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-databases-phpmyadmin-token',
        '/api/user/webspaces/{uuidShort}/databases/{databaseId}/phpmyadmin/token',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $databaseId = (int) ($args['databaseId'] ?? 0);
            if ($uuidShort === '' || $databaseId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceDatabaseController())->generatePhpMyAdminToken($request, $uuidShort, $databaseId);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-databases-phppgadmin-check',
        '/api/user/webspaces/{uuidShort}/databases/phppgadmin/check',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceDatabaseController())->checkPhpPgAdminInstalled($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-databases-phppgadmin-token',
        '/api/user/webspaces/{uuidShort}/databases/{databaseId}/phppgadmin/token',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $databaseId = (int) ($args['databaseId'] ?? 0);
            if ($uuidShort === '' || $databaseId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceDatabaseController())->generatePhpPgAdminToken($request, $uuidShort, $databaseId);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces',
    );
};
