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
use App\Controllers\User\Vds\VmUserInstanceController;

return function (RouteCollection $routes): void {

    // Get all VM instances for the authenticated user
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-vm-instances',
        '/api/user/vm-instances',
        function (Request $request) {
            return (new VmUserInstanceController())->getUserVmInstances($request);
        },
        ['GET'],
        Rate::perSecond(2),
        'user-vm-instances'
    );

    // Get specific VM instance details
    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-get',
        '/api/user/vm-instances/{id}',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }
            return (new VmUserInstanceController())->getVmInstance($request, $id);
        },
        'id',
        ['GET'],
        Rate::perMinute(30)
    );

    // Get VM instance status
    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-status',
        '/api/user/vm-instances/{id}/status',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }
            return (new VmUserInstanceController())->getVmInstanceStatus($request, $id);
        },
        'id',
        ['GET'],
        Rate::perMinute(30)
    );

    // Power actions (start, stop, reboot)
    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-power',
        '/api/user/vm-instances/{id}/power',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }
            return (new VmUserInstanceController())->powerAction($request, $id);
        },
        'id',
        ['POST'],
        Rate::perMinute(10)
    );

    // Get VNC console ticket
    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-vnc',
        '/api/user/vm-instances/{id}/vnc-ticket',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }
            return (new VmUserInstanceController())->getVncTicket($request, $id);
        },
        'id',
        ['GET'],
        Rate::perMinute(10)
    );
};