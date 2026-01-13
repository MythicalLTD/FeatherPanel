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
use App\Controllers\Admin\PluginsController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\CloudPluginsController;

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

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-plugins-previously-installed',
        '/api/admin/plugins/previously-installed',
        function (Request $request) {
            return (new CloudPluginsController())->getPreviouslyInstalled($request);
        },
        Permissions::ADMIN_PLUGINS_VIEW,
    );
};
