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
use App\Controllers\Admin\CloudPluginsController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-plugins-list',
        '/api/admin/plugins/online/list',
        function (Request $request) {
            return (new CloudPluginsController())->list($request);
        },
        Permissions::ADMIN_PLUGINS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-plugins-popular',
        '/api/admin/plugins/online/popular',
        function (Request $request) {
            return (new CloudPluginsController())->popular($request);
        },
        Permissions::ADMIN_PLUGINS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-plugins-show',
        '/api/admin/plugins/online/{identifier}',
        function (Request $request, array $args) {
            $identifier = $args['identifier'] ?? null;
            if (!$identifier || !is_string($identifier)) {
                return \App\Helpers\ApiResponse::error('Missing or invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            return (new CloudPluginsController())->show($request, $identifier);
        },
        Permissions::ADMIN_PLUGINS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-plugins-check',
        '/api/admin/plugins/online/{identifier}/check',
        function (Request $request, array $args) {
            $identifier = $args['identifier'] ?? null;
            if (!$identifier || !is_string($identifier)) {
                return \App\Helpers\ApiResponse::error('Missing or invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            return (new CloudPluginsController())->checkRequirements($request, $identifier);
        },
        Permissions::ADMIN_PLUGINS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-plugins-tag',
        '/api/admin/plugins/online/tag/{tag}',
        function (Request $request, array $args) {
            $tag = $args['tag'] ?? null;
            if (!$tag || !is_string($tag)) {
                return \App\Helpers\ApiResponse::error('Missing or invalid tag', 'INVALID_TAG', 400);
            }

            return (new CloudPluginsController())->searchByTag($request, $tag);
        },
        Permissions::ADMIN_PLUGINS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-plugins-install',
        '/api/admin/plugins/online/install',
        function (Request $request) {
            return (new CloudPluginsController())->install($request);
        },
        Permissions::ADMIN_PLUGINS_MANAGE,
        ['POST']
    );
};
