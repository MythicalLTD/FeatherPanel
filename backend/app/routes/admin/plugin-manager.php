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
use App\Permissions;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\PluginManagerController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugin-manager-list',
        '/api/admin/plugin-manager',
        function (Request $request) {
            return (new PluginManagerController())->getPlugins($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugin-manager-create',
        '/api/admin/plugin-manager',
        function (Request $request) {
            return (new PluginManagerController())->createPlugin($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugin-manager-get',
        '/api/admin/plugin-manager/{identifier}',
        function (Request $request) {
            return (new PluginManagerController())->getPluginDetails($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugin-manager-update',
        '/api/admin/plugin-manager/{identifier}',
        function (Request $request) {
            return (new PluginManagerController())->updatePlugin($request);
        },
        Permissions::ADMIN_ROOT,
        ['PUT', 'PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugin-manager-settings',
        '/api/admin/plugin-manager/{identifier}/settings',
        function (Request $request) {
            return (new PluginManagerController())->updatePluginSettings($request);
        },
        Permissions::ADMIN_ROOT,
        ['PUT', 'PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugin-manager-flags',
        '/api/admin/plugin-manager/flags',
        function (Request $request) {
            return (new PluginManagerController())->getAvailableFlags($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugin-manager-validate',
        '/api/admin/plugin-manager/{identifier}/validate',
        function (Request $request) {
            return (new PluginManagerController())->validatePlugin($request);
        },
        Permissions::ADMIN_ROOT,
    );

    // ===== DEV TOOLS ROUTES =====

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugin-creation-options',
        '/api/admin/plugin-tools/creation-options',
        function (Request $request) {
            return (new PluginManagerController())->getPluginCreationOptions($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugin-create-file',
        '/api/admin/plugin-tools/create-file',
        function (Request $request) {
            return (new PluginManagerController())->createPluginFile($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST']
    );
};
