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
use App\Controllers\User\Server\Power\ServerPowerController;

return function (RouteCollection $routes): void {

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-power',
        '/api/user/servers/{uuidShort}/power/{action}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $action = $args['action'] ?? null;
            if (!$uuidShort || !$action) {
                return ApiResponse::error('Missing or invalid UUID short or action', 'INVALID_UUID_SHORT_OR_ACTION', 400);
            }

            return (new ServerPowerController())->sendPowerAction($request, $uuidShort, $action);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST'],
        Rate::perMinute(2), // Default: Admin can override in ratelimit.json
        'user-server-power'
    );
};
