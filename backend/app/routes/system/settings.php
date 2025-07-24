<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

use Symfony\Component\Routing\Route;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\System\SettingsController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    // GET example
    $routes->add('settings', new Route('/api/system/settings', [
        '_controller' => function (Request $request) {
            return (new SettingsController())->index($request);
        },
        '_middleware' => [],
    ]));
};
