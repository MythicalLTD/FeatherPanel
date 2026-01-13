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
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\SubdomainsController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-index',
        '/api/admin/subdomains',
        static function (Request $request) {
            return (new SubdomainsController())->index($request);
        },
        Permissions::ADMIN_SUBDOMAINS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-settings',
        '/api/admin/subdomains/settings',
        static function (Request $request) {
            if ($request->getMethod() === 'PATCH') {
                return (new SubdomainsController())->settings($request);
            }

            return (new SubdomainsController())->settings($request);
        },
        Permissions::ADMIN_SUBDOMAINS_EDIT,
        ['GET', 'PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-spells',
        '/api/admin/subdomains/spells',
        static function () {
            return (new SubdomainsController())->spells();
        },
        Permissions::ADMIN_SUBDOMAINS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-show',
        '/api/admin/subdomains/{uuid}',
        static function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new SubdomainsController())->show($request, $uuid);
        },
        Permissions::ADMIN_SUBDOMAINS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-create',
        '/api/admin/subdomains',
        static function (Request $request) {
            return (new SubdomainsController())->create($request);
        },
        Permissions::ADMIN_SUBDOMAINS_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-update',
        '/api/admin/subdomains/{uuid}',
        static function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new SubdomainsController())->update($request, $uuid);
        },
        Permissions::ADMIN_SUBDOMAINS_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-delete',
        '/api/admin/subdomains/{uuid}',
        static function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new SubdomainsController())->delete($request, $uuid);
        },
        Permissions::ADMIN_SUBDOMAINS_DELETE,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-subdomain-list',
        '/api/admin/subdomains/{uuid}/subdomains',
        static function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new SubdomainsController())->listSubdomains($uuid);
        },
        Permissions::ADMIN_SUBDOMAINS_VIEW,
        ['GET']
    );
};
