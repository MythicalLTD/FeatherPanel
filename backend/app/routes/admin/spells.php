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
use App\Controllers\Admin\SpellsController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spells',
        '/api/admin/spells',
        function (Request $request) {
            return (new SpellsController())->index($request);
        },
        Permissions::ADMIN_SPELLS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spells-show',
        '/api/admin/spells/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new SpellsController())->show($request, (int) $id);
        },
        Permissions::ADMIN_SPELLS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spells-update',
        '/api/admin/spells/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new SpellsController())->update($request, (int) $id);
        },
        Permissions::ADMIN_SPELLS_EDIT,
        ['PATCH']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spells-delete',
        '/api/admin/spells/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new SpellsController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_SPELLS_DELETE,
        ['DELETE']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spells-create',
        '/api/admin/spells',
        function (Request $request) {
            return (new SpellsController())->create($request);
        },
        Permissions::ADMIN_SPELLS_CREATE,
        ['PUT']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spells-by-realm',
        '/api/admin/spells/realm/{realmId}',
        function (Request $request, array $args) {
            $realmId = $args['realmId'] ?? null;
            if (!$realmId || !is_numeric($realmId)) {
                return ApiResponse::error('Missing or invalid realm ID', 'INVALID_REALM_ID', 400);
            }

            return (new SpellsController())->getByRealm($request, (int) $realmId);
        },
        Permissions::ADMIN_SPELLS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spells-import',
        '/api/admin/spells/import',
        function (Request $request) {
            return (new SpellsController())->import($request);
        },
        Permissions::ADMIN_SPELLS_CREATE,
        ['POST']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spells-export',
        '/api/admin/spells/{id}/export',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid spell ID', 'INVALID_ID', 400);
            }

            return (new SpellsController())->export($request, (int) $id);
        },
        Permissions::ADMIN_SPELLS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spell-variables-list',
        '/api/admin/spells/{spellId}/variables',
        function (Request $request, array $args) {
            $spellId = $args['spellId'] ?? null;
            if (!$spellId || !is_numeric($spellId)) {
                return ApiResponse::error('Missing or invalid spell ID', 'INVALID_SPELL_ID', 400);
            }

            return (new SpellsController())->listVariables($request, (int) $spellId);
        },
        Permissions::ADMIN_SPELLS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spell-variables-create',
        '/api/admin/spells/{spellId}/variables',
        function (Request $request, array $args) {
            $spellId = $args['spellId'] ?? null;
            if (!$spellId || !is_numeric($spellId)) {
                return ApiResponse::error('Missing or invalid spell ID', 'INVALID_SPELL_ID', 400);
            }

            return (new SpellsController())->createVariable($request, (int) $spellId);
        },
        Permissions::ADMIN_SPELLS_EDIT,
        ['POST']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spell-variables-update',
        '/api/admin/spell-variables/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid variable ID', 'INVALID_ID', 400);
            }

            return (new SpellsController())->updateVariable($request, (int) $id);
        },
        Permissions::ADMIN_SPELLS_EDIT,
        ['PATCH']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spell-variables-delete',
        '/api/admin/spell-variables/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid variable ID', 'INVALID_ID', 400);
            }

            return (new SpellsController())->deleteVariable($request, (int) $id);
        },
        Permissions::ADMIN_SPELLS_EDIT,
        ['DELETE']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spells-online-list',
        '/api/admin/spells/online/list',
        function (Request $request) {
            return (new SpellsController())->onlineList($request);
        },
        Permissions::ADMIN_SPELLS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-spells-online-install',
        '/api/admin/spells/online/install',
        function (Request $request) {
            return (new SpellsController())->onlineInstall($request);
        },
        Permissions::ADMIN_SPELLS_CREATE,
        ['POST']
    );
};
