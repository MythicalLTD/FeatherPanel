<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
