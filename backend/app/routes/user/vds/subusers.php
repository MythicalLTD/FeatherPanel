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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Vds\VmUserSubuserController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-subusers-list',
        '/api/user/vm-instances/{id}/subusers',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);

            return (new VmUserSubuserController())->listSubusers($request, $id);
        },
        'id',
        ['GET'],
        Rate::perMinute(30)
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-subusers-create',
        '/api/user/vm-instances/{id}/subusers',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);

            return (new VmUserSubuserController())->createSubuser($request, $id);
        },
        'id',
        ['POST'],
        Rate::perMinute(10)
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-subusers-delete',
        '/api/user/vm-instances/{id}/subusers/{subuserId}',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            $subuserId = (int) ($args['subuserId'] ?? 0);

            return (new VmUserSubuserController())->deleteSubuser($request, $id, $subuserId);
        },
        'id',
        ['DELETE'],
        Rate::perMinute(10)
    );
};
