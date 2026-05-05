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
use App\Controllers\Admin\LdapProvidersController;

return function (RouteCollection $routes): void {
    // List all LDAP providers
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ldap-providers-index',
        '/api/admin/ldap/providers',
        function (Request $request) {
            return (new LdapProvidersController())->index($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW
    );

    // Create LDAP provider
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ldap-providers-create',
        '/api/admin/ldap/providers',
        function (Request $request) {
            return (new LdapProvidersController())->create($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PUT']
    );

    // Update LDAP provider
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ldap-providers-update',
        '/api/admin/ldap/providers/{uuid}',
        function (Request $request) {
            $uuid = $request->attributes->get('uuid');
            if (!$uuid || !is_string($uuid)) {
                return \App\Helpers\ApiResponse::error('Invalid UUID', 'INVALID_UUID', 400);
            }

            return (new LdapProvidersController())->update($request, $uuid);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST']
    );

    // Delete LDAP provider
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ldap-providers-delete',
        '/api/admin/ldap/providers/{uuid}',
        function (Request $request) {
            $uuid = $request->attributes->get('uuid');
            if (!$uuid || !is_string($uuid)) {
                return \App\Helpers\ApiResponse::error('Invalid UUID', 'INVALID_UUID', 400);
            }

            return (new LdapProvidersController())->delete($request, $uuid);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['DELETE']
    );

    // Test LDAP provider connection
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-ldap-providers-test',
        '/api/admin/ldap/providers/{uuid}/test',
        function (Request $request) {
            $uuid = $request->attributes->get('uuid');
            if (!$uuid || !is_string($uuid)) {
                return \App\Helpers\ApiResponse::error('Invalid UUID', 'INVALID_UUID', 400);
            }

            return (new LdapProvidersController())->testConnection($request, $uuid);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['POST']
    );
};
