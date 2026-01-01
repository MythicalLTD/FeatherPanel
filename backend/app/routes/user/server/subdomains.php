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
use App\Chat\Server;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Server\SubdomainController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-subdomains-index',
        '/api/user/servers/{uuidShort}/subdomains',
        static function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort || !is_string($uuidShort)) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new SubdomainController())->index($request, $server);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-subdomains'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-subdomains-create',
        '/api/user/servers/{uuidShort}/subdomains',
        static function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort || !is_string($uuidShort)) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new SubdomainController())->create($request, $server);
        },
        'uuidShort',
        ['PUT']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-subdomains-delete',
        '/api/user/servers/{uuidShort}/subdomains/{uuid}',
        static function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $uuid = $args['uuid'] ?? null;
            if (!$uuidShort || !is_string($uuidShort) || !$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new SubdomainController())->delete($request, $server, $uuid);
        },
        'uuidShort',
        ['DELETE'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-subdomains'
    );
};
