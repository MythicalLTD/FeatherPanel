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
use App\Controllers\Admin\OidcProvidersController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-oidc-providers',
        '/api/admin/oidc/providers',
        function (Request $request) {
            return (new OidcProvidersController())->index($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-oidc-providers-create',
        '/api/admin/oidc/providers',
        function (Request $request) {
            return (new OidcProvidersController())->create($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-oidc-providers-update',
        '/api/admin/oidc/providers/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new OidcProvidersController())->update($request, $uuid);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-oidc-providers-delete',
        '/api/admin/oidc/providers/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new OidcProvidersController())->delete($request, $uuid);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['DELETE']
    );
};

