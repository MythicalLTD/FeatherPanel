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
use App\Controllers\User\WebSpaces\WebSpaceSftpAccountController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-sftp-accounts',
        '/api/user/webspaces/{uuidShort}/sftp-accounts',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceSftpAccountController())->index($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-sftp-accounts-create',
        '/api/user/webspaces/{uuidShort}/sftp-accounts',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceSftpAccountController())->create($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-sftp-accounts-update',
        '/api/user/webspaces/{uuidShort}/sftp-accounts/{accountId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $accountId = (int) ($args['accountId'] ?? 0);
            if ($uuidShort === '' || $accountId <= 0) {
                return ApiResponse::error('Missing uuidShort or accountId', 'INVALID_ARGS', 400);
            }

            return (new WebSpaceSftpAccountController())->update($request, $uuidShort, $accountId);
        },
        ['PATCH'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-sftp-accounts-delete',
        '/api/user/webspaces/{uuidShort}/sftp-accounts/{accountId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $accountId = (int) ($args['accountId'] ?? 0);
            if ($uuidShort === '' || $accountId <= 0) {
                return ApiResponse::error('Missing uuidShort or accountId', 'INVALID_ARGS', 400);
            }

            return (new WebSpaceSftpAccountController())->delete($request, $uuidShort, $accountId);
        },
        ['DELETE'],
        Rate::perMinute(10),
        'user-webspaces'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-sftp-accounts-reset-password',
        '/api/user/webspaces/{uuidShort}/sftp-accounts/{accountId}/reset-password',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $accountId = (int) ($args['accountId'] ?? 0);
            if ($uuidShort === '' || $accountId <= 0) {
                return ApiResponse::error('Missing uuidShort or accountId', 'INVALID_ARGS', 400);
            }

            return (new WebSpaceSftpAccountController())->resetPassword($request, $uuidShort, $accountId);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces'
    );
};
