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
        ['GET']
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
        ['POST']
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
        ['PUT']
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
        ['POST']
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
        ['GET']
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
        ['GET']
    );
};
