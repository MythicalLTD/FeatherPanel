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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\System\PluginThemesController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerApiRoute(
        $routes,
        'plugin-themes',
        '/api/system/plugin-themes',
        function (Request $request) {
            return (new PluginThemesController())->index($request);
        },
    );

    App::getInstance(true)->registerApiRoute(
        $routes,
        'plugin-theme-css',
        '/api/system/plugin-theme-css',
        function (Request $request) {
            return (new PluginThemesController())->css($request);
        },
    );
};
