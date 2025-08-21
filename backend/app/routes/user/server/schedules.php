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
