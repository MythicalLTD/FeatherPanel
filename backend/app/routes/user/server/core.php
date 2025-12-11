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
use App\Controllers\User\Server\ServerUserController;

return function (RouteCollection $routes): void {

    // Rate limit: Admin can override in ratelimit.json, default is 2 per second
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'session-servers',
        '/api/user/servers',
        function (Request $request) {
            return (new ServerUserController())->getUserServers($request);
        },
        ['GET'],
        Rate::perSecond(2), // Default: Admin can override in ratelimit.json
        'user-servers'
    );

    // Rate limit: Admin can override in ratelimit.json, default is 30 per minute
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-get',
        '/api/user/servers/{uuidShort}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->getServer($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['GET'],
        Rate::perMinute(30) // Default: Admin can override in ratelimit.json
    );

    // Rate limit: Admin can override in ratelimit.json, default is 10 per minute
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-jwt',
        '/api/user/servers/{uuidShort}/jwt',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->generateServerJwt($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST']
    );

    // Rate limit: Admin can override in ratelimit.json, default is 1 per minute
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-update',
        '/api/user/servers/{uuidShort}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->updateServer($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['PUT'],
        Rate::perMinute(2), // Default: Admin can override in ratelimit.json
        'user-server-update'
    );

    // Rate limit: Admin can override in ratelimit.json, default is 1 per minute
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-reinstall',
        '/api/user/servers/{uuidShort}/reinstall',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerUserController())->reinstallServer($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST'],
        Rate::perMinute(1) // Default: Admin can override in ratelimit.json
    );

    // Rate limit: Admin can override in ratelimit.json, default is 30 per minute
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-command',
        '/api/user/servers/{uuidShort}/command',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->sendCommand($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST'],
        Rate::perMinute(30) // Default: Admin can override in ratelimit.json
    );
};
