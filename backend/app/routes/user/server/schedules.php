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
use App\Controllers\User\Server\ServerScheduleController;

return function (RouteCollection $routes): void {

    // Schedule-related routes
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-schedules',
        '/api/user/servers/{uuidShort}/schedules',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerScheduleController())->getSchedules($request, $server['uuid']);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-schedules'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-create-schedule',
        '/api/user/servers/{uuidShort}/schedules',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerScheduleController())->createSchedule($request, $server['uuid']);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-schedules'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-get-schedule',
        '/api/user/servers/{uuidShort}/schedules/{scheduleId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $scheduleId = $args['scheduleId'] ?? null;
            if (!$uuidShort || !$scheduleId) {
                return ApiResponse::error('Missing or invalid UUID short or schedule ID', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerScheduleController())->getSchedule($request, $server['uuid'], (int) $scheduleId);
        },
        'uuidShort',
        ['GET']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-update-schedule',
        '/api/user/servers/{uuidShort}/schedules/{scheduleId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $scheduleId = $args['scheduleId'] ?? null;
            if (!$uuidShort || !$scheduleId) {
                return ApiResponse::error('Missing or invalid UUID short or schedule ID', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerScheduleController())->updateSchedule($request, $server['uuid'], (int) $scheduleId);
        },
        'uuidShort',
        ['PUT'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-schedules'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-delete-schedule',
        '/api/user/servers/{uuidShort}/schedules/{scheduleId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $scheduleId = $args['scheduleId'] ?? null;
            if (!$uuidShort || !$scheduleId) {
                return ApiResponse::error('Missing or invalid UUID short or schedule ID', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerScheduleController())->deleteSchedule($request, $server['uuid'], (int) $scheduleId);
        },
        'uuidShort',
        ['DELETE']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-toggle-schedule-status',
        '/api/user/servers/{uuidShort}/schedules/{scheduleId}/toggle',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $scheduleId = $args['scheduleId'] ?? null;
            if (!$uuidShort || !$scheduleId) {
                return ApiResponse::error('Missing or invalid UUID short or schedule ID', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerScheduleController())->toggleScheduleStatus($request, $server['uuid'], (int) $scheduleId);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-schedules'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-active-schedules',
        '/api/user/servers/{uuidShort}/schedules/active',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerScheduleController())->getActiveSchedules($request, $server['uuid']);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-schedules'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-due-schedules',
        '/api/user/servers/{uuidShort}/schedules/due',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerScheduleController())->getDueSchedules($request, $uuidShort);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-schedules'
    );
};
