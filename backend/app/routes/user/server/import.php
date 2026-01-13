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
use App\Controllers\User\Server\ServerImportController;

return function (RouteCollection $routes): void {
    // Import server files from remote SFTP/FTP
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-import',
        '/api/user/servers/{uuidShort}/import',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerImportController())->importServer($request, $uuidShort);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(5), // Lower rate limit for imports (resource-intensive)
        'user-server-import'
    );

    // List server imports
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-imports-list',
        '/api/user/servers/{uuidShort}/imports',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerImportController())->listImports($request, $uuidShort);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30),
        'user-server-import'
    );
};
