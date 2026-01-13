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
use App\Controllers\User\NodeStatusController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    // GET - GET /api/status (public, no auth required)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'public-status',
        '/api/status',
        function (Request $request) {
            return (new NodeStatusController())->getStatus($request);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'public-status'
    );
};
