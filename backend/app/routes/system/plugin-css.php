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
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\System\PluginCssController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerApiRoute(
        $routes,
        'plugin-css',
        '/api/system/plugin-css',
        function (Request $request) {
            return (new PluginCssController())->index($request);
        },
    );
};
