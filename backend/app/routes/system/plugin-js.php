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
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\System\PluginJsController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerApiRoute(
        $routes,
        'plugin-js',
        '/api/system/plugin-js',
        function (Request $request) {
            return (new PluginJsController())->index($request);
        },
    );
};
