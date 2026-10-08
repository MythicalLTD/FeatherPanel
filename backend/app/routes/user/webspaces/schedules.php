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
use App\Controllers\User\WebSpaces\WebSpaceScheduleController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-schedules',
        '/api/user/webspaces/{uuidShort}/schedules',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceScheduleController())->index($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-schedules-create',
        '/api/user/webspaces/{uuidShort}/schedules',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceScheduleController())->create($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-schedules-abort',
        '/api/user/webspaces/{uuidShort}/schedules/abort',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceScheduleController())->abort($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-schedules-show',
        '/api/user/webspaces/{uuidShort}/schedules/{scheduleId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $scheduleId = (int) ($args['scheduleId'] ?? 0);
            if ($uuidShort === '' || $scheduleId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceScheduleController())->show($request, $uuidShort, $scheduleId);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-schedules-update',
        '/api/user/webspaces/{uuidShort}/schedules/{scheduleId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $scheduleId = (int) ($args['scheduleId'] ?? 0);
            if ($uuidShort === '' || $scheduleId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceScheduleController())->update($request, $uuidShort, $scheduleId);
        },
        ['PUT'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-schedules-delete',
        '/api/user/webspaces/{uuidShort}/schedules/{scheduleId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $scheduleId = (int) ($args['scheduleId'] ?? 0);
            if ($uuidShort === '' || $scheduleId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceScheduleController())->delete($request, $uuidShort, $scheduleId);
        },
        ['DELETE'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-schedules-toggle',
        '/api/user/webspaces/{uuidShort}/schedules/{scheduleId}/toggle',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $scheduleId = (int) ($args['scheduleId'] ?? 0);
            if ($uuidShort === '' || $scheduleId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceScheduleController())->toggle($request, $uuidShort, $scheduleId);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-schedules-execute',
        '/api/user/webspaces/{uuidShort}/schedules/{scheduleId}/execute',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $scheduleId = (int) ($args['scheduleId'] ?? 0);
            if ($uuidShort === '' || $scheduleId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceScheduleController())->execute($request, $uuidShort, $scheduleId);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces',
    );
};
