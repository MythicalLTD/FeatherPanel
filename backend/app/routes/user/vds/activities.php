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
use App\Controllers\User\Vds\VmUserActivityController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-activities',
        '/api/user/vm-instances/{id}/activities',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }
            return (new VmUserActivityController())->getVmInstanceActivities($request, $id);
        },
        'id',
        ['GET'],
        Rate::perMinute(30)
    );
};
