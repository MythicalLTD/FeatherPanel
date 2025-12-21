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

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-plugins-previously-installed',
        '/api/admin/plugins/online/previously-installed',
        function (Request $request) {
            return (new CloudPluginsController())->getPreviouslyInstalled($request);
        },
        Permissions::ADMIN_PLUGINS_VIEW,
    );
};
