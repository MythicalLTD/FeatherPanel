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
use App\Controllers\User\Server\Files\FileTransferController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-file-transfer-targets',
        '/api/user/servers/{uuidShort}/files/transfer-targets',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new FileTransferController())->targets($request, $uuidShort);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30),
        'user-server-files'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-file-transfer-create',
        '/api/user/servers/{uuidShort}/files/transfer',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new FileTransferController())->create($request, $uuidShort);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(10),
        'user-server-files'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'session-file-transfers',
        '/api/user/files/transfers',
        function (Request $request) {
            return (new FileTransferController())->list($request);
        },
        ['GET'],
        Rate::perMinute(120),
        'user-session'
    );
};
