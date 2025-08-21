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
        ['POST']
    );
};
