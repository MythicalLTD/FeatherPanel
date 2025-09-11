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
        'admin-plugins-online-list',
        '/api/admin/plugins/online/list',
        function (Request $request) {
            return (new PluginsController())->onlineList($request);
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
        'admin-plugins-online-install',
        '/api/admin/plugins/online/install',
        function (Request $request) {
            return (new PluginsController())->onlineInstall($request);
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
};
