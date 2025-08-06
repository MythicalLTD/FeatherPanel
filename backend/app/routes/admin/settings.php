<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

use App\App;
use App\Permissions;
use App\Controllers\Admin\SettingsController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings',
        '/api/admin/settings',
        function (Request $request) {
            return (new SettingsController())->index($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-show',
        '/api/admin/settings/{setting}',
        function (Request $request, string $setting) {
            return (new SettingsController())->show($request, $setting);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-update',
        '/api/admin/settings',
        function (Request $request) {
            return (new SettingsController())->update($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PATCH']
    );
};
