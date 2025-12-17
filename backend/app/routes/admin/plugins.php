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
use App\Controllers\Admin\PluginsController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugins',
        '/api/admin/plugins',
        function (Request $request) {
            return (new PluginsController())->index($request);
        },
        Permissions::ADMIN_PLUGINS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugins-config',
        '/api/admin/plugins/{identifier}/config',
        function (Request $request, array $args) {
            $identifier = $args['identifier'] ?? null;
            if (!$identifier || !is_string($identifier)) {
                return \App\Helpers\ApiResponse::error('Missing or invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            return (new PluginsController())->getConfig($request, $identifier);
        },
        Permissions::ADMIN_PLUGINS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugins-settings-set',
        '/api/admin/plugins/{identifier}/settings/set',
        function (Request $request, array $args) {
            $identifier = $args['identifier'] ?? null;
            if (!$identifier || !is_string($identifier)) {
                return \App\Helpers\ApiResponse::error('Missing or invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            return (new PluginsController())->setSettings($request, $identifier);
        },
        Permissions::ADMIN_PLUGINS_MANAGE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugins-settings-remove',
        '/api/admin/plugins/{identifier}/settings/remove',
        function (Request $request, array $args) {
            $identifier = $args['identifier'] ?? null;
            if (!$identifier || !is_string($identifier)) {
                return \App\Helpers\ApiResponse::error('Missing or invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            return (new PluginsController())->removeSettings($request, $identifier);
        },
        Permissions::ADMIN_PLUGINS_MANAGE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugins-uninstall',
        '/api/admin/plugins/{identifier}/uninstall',
        function (Request $request, array $args) {
            $identifier = $args['identifier'] ?? null;
            if (!$identifier || !is_string($identifier)) {
                return \App\Helpers\ApiResponse::error('Missing or invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            return (new PluginsController())->uninstall($request, $identifier);
        },
        Permissions::ADMIN_PLUGINS_MANAGE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugins-export',
        '/api/admin/plugins/{identifier}/export',
        function (Request $request, array $args) {
            $identifier = $args['identifier'] ?? null;
            if (!$identifier || !is_string($identifier)) {
                return \App\Helpers\ApiResponse::error('Missing or invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            return (new PluginsController())->export($request, $identifier);
        },
        Permissions::ADMIN_PLUGINS_MANAGE,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugins-upload-install',
        '/api/admin/plugins/upload/install',
        function (Request $request) {
            return (new PluginsController())->uploadInstall($request);
        },
        Permissions::ADMIN_PLUGINS_MANAGE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugins-upload-install-url',
        '/api/admin/plugins/upload/install-url',
        function (Request $request) {
            return (new PluginsController())->uploadInstallFromUrl($request);
        },
        Permissions::ADMIN_PLUGINS_MANAGE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugins-resync-symlinks',
        '/api/admin/plugins/{identifier}/resync-symlinks',
        function (Request $request, array $args) {
            $identifier = $args['identifier'] ?? null;
            if (!$identifier || !is_string($identifier)) {
                return \App\Helpers\ApiResponse::error('Missing or invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            return (new PluginsController())->resyncSymlinks($request, $identifier);
        },
        Permissions::ADMIN_PLUGINS_MANAGE,
        ['POST']
    );
};
