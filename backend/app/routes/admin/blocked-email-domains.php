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
use App\Controllers\Admin\BlockedEmailDomainsController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-blocked-email-domains',
        '/api/admin/blocked-email-domains',
        function (Request $request) {
            return (new BlockedEmailDomainsController())->index($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-blocked-email-domains-create',
        '/api/admin/blocked-email-domains',
        function (Request $request) {
            return (new BlockedEmailDomainsController())->create($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-blocked-email-domains-import-preset',
        '/api/admin/blocked-email-domains/import-preset',
        function (Request $request) {
            return (new BlockedEmailDomainsController())->importPreset($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-blocked-email-domains-import-url',
        '/api/admin/blocked-email-domains/import-url',
        function (Request $request) {
            return (new BlockedEmailDomainsController())->importFromUrl($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-blocked-email-domains-import-text',
        '/api/admin/blocked-email-domains/import-text',
        function (Request $request) {
            return (new BlockedEmailDomainsController())->importFromText($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-blocked-email-domains-delete',
        '/api/admin/blocked-email-domains/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if ($id === null || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid id', 'INVALID_ID', 400);
            }

            return (new BlockedEmailDomainsController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['DELETE']
    );
};
