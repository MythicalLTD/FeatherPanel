<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
use App\Controllers\User\TicketsController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    // GET - GET /api/user/tickets
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-tickets',
        '/api/user/tickets',
        function (Request $request) {
            return (new TicketsController())->index($request);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-tickets'
    );

    // PUT - PUT /api/user/tickets
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-tickets-create',
        '/api/user/tickets',
        function (Request $request) {
            return (new TicketsController())->create($request);
        },
        ['PUT']
    );

    // GET - GET /api/user/tickets/categories (must come before /api/user/tickets/{uuid})
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-tickets-categories',
        '/api/user/tickets/categories',
        function (Request $request) {
            return (new TicketsController())->getCategories($request);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-tickets'
    );

    // GET - GET /api/user/tickets/priorities (must come before /api/user/tickets/{uuid})
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-tickets-priorities',
        '/api/user/tickets/priorities',
        function (Request $request) {
            return (new TicketsController())->getPriorities($request);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-tickets'
    );

    // GET - GET /api/user/tickets/statuses (must come before /api/user/tickets/{uuid})
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-tickets-statuses',
        '/api/user/tickets/statuses',
        function (Request $request) {
            return (new TicketsController())->getStatuses($request);
        },
        ['GET']
    );

    // GET - GET /api/user/tickets/servers (must come before /api/user/tickets/{uuid})
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-tickets-servers',
        '/api/user/tickets/servers',
        function (Request $request) {
            return (new TicketsController())->getServers($request);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-tickets'
    );

    // POST - POST /api/user/tickets/{uuid}/reply (must come before /api/user/tickets/{uuid})
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-tickets-reply',
        '/api/user/tickets/{uuid}/reply',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new TicketsController())->reply($request, $uuid);
        },
        ['POST']
    );

    // POST - POST /api/user/tickets/{uuid}/attachments (must come before /api/user/tickets/{uuid})
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-tickets-upload-attachment',
        '/api/user/tickets/{uuid}/attachments',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new TicketsController())->uploadAttachment($request, $uuid);
        },
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-tickets'
    );

    // DELETE - DELETE /api/user/tickets/{uuid}/messages/{id} (must come before /api/user/tickets/{uuid})
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-tickets-delete-message',
        '/api/user/tickets/{uuid}/messages/{id}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            $id = $args['id'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid message ID', 'INVALID_MESSAGE_ID', 400);
            }

            return (new TicketsController())->deleteMessage($request, $uuid, (int) $id);
        },
        ['DELETE']
    );

    // DELETE - DELETE /api/user/tickets/{uuid} (must come before GET /api/user/tickets/{uuid})
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-tickets-delete',
        '/api/user/tickets/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new TicketsController())->delete($request, $uuid);
        },
        ['DELETE']
    );

    // GET - GET /api/user/tickets/{uuid} (must come LAST - parameterized route)
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-tickets-show',
        '/api/user/tickets/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new TicketsController())->show($request, $uuid);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-tickets'
    );
};
