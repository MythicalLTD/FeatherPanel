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
use RateLimit\Rate;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {

    // Task-related routes
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-tasks',
        '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks',
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

            return (new \App\Controllers\User\Server\TaskController())->getTasks($request, $server['uuid'], (int) $scheduleId);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-tasks'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-create-task',
        '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks',
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

            return (new \App\Controllers\User\Server\TaskController())->createTask($request, $server['uuid'], (int) $scheduleId);
        },
        'uuidShort',
        ['POST']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-get-task',
        '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks/{taskId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $scheduleId = $args['scheduleId'] ?? null;
            $taskId = $args['taskId'] ?? null;
            if (!$uuidShort || !$scheduleId || !$taskId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\TaskController())->getTask($request, $server['uuid'], (int) $scheduleId, (int) $taskId);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-tasks'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-update-task',
        '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks/{taskId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $scheduleId = $args['scheduleId'] ?? null;
            $taskId = $args['taskId'] ?? null;
            if (!$uuidShort || !$scheduleId || !$taskId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\TaskController())->updateTask($request, $server['uuid'], (int) $scheduleId, (int) $taskId);
        },
        'uuidShort',
        ['PUT'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-tasks'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-delete-task',
        '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks/{taskId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $scheduleId = $args['scheduleId'] ?? null;
            $taskId = $args['taskId'] ?? null;
            if (!$uuidShort || !$scheduleId || !$taskId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\TaskController())->deleteTask($request, $server['uuid'], (int) $scheduleId, (int) $taskId);
        },
        'uuidShort',
        ['DELETE']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-update-task-sequence',
        '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks/{taskId}/sequence',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $scheduleId = $args['scheduleId'] ?? null;
            $taskId = $args['taskId'] ?? null;
            if (!$uuidShort || !$scheduleId || !$taskId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\TaskController())->updateTaskSequence($request, $server['uuid'], (int) $scheduleId, (int) $taskId);
        },
        'uuidShort',
        ['PUT'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-tasks'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-toggle-task-queued',
        '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks/{taskId}/queue',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $scheduleId = $args['scheduleId'] ?? null;
            $taskId = $args['taskId'] ?? null;
            if (!$uuidShort || !$scheduleId || !$taskId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\TaskController())->toggleTaskQueuedStatus($request, $server['uuid'], (int) $scheduleId, (int) $taskId);
        },
        'uuidShort',
        ['PUT'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-tasks'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-tasks-with-schedule',
        '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks/with-schedule',
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

            return (new \App\Controllers\User\Server\TaskController())->getTasksWithSchedule($request, $server['uuid'], (int) $scheduleId);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-tasks'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-queued-tasks',
        '/api/user/servers/{uuidShort}/tasks/queued',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\TaskController())->getQueuedTasks($request, $server['uuid']);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-tasks'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-ready-tasks',
        '/api/user/servers/{uuidShort}/tasks/ready',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new \App\Controllers\User\Server\TaskController())->getReadyTasks($request, $server['uuid']);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-tasks'
    );
};
