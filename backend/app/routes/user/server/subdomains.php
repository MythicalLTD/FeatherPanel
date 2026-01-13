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
