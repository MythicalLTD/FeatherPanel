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
use App\Controllers\System\DebugController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    // Diagnostics endpoint: it echoes every request header and the raw server
    // variables (i.e. the whole proxy/IP resolution chain). Keep it out of
    // production unless APP_DEBUG is explicitly switched on - no frontend code
    // calls it.
    //
    // Stock installs leave APP_DEBUG=false in backend/public/index.php, so this
    // file returns early and /api/debug/ip is never registered. Operators who
    // need the endpoint must flip APP_DEBUG to true in that entry point.
    // See SECURITY-FIXES-2026-10-14.md §12.
    if (!defined('APP_DEBUG') || APP_DEBUG !== true) {
        return;
    }

    App::getInstance(true)->registerApiRoute(
        $routes,
        'debug-ip',
        '/api/debug/ip',
        function (Request $request) {
            return (new DebugController())->getIPDebugInfo($request);
        },
    );
};
