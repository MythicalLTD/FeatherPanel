<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
