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
use App\Helpers\ApiResponse;
use App\Controllers\Admin\ServersController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers',
        '/api/admin/servers',
        function (Request $request) {
            return (new ServersController())->index($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-show',
        '/api/admin/servers/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid server ID', 'INVALID_SERVER_ID', 400);
            }

            return (new ServersController())->show($request, (int) $id);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-update',
        '/api/admin/servers/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid server ID', 'INVALID_SERVER_ID', 400);
            }

            return (new ServersController())->update($request, (int) $id);
        },
        Permissions::ADMIN_SERVERS_EDIT,
        ['PATCH']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-delete',
        '/api/admin/servers/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid server ID', 'INVALID_SERVER_ID', 400);
            }

            return (new ServersController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_SERVERS_DELETE,
        ['DELETE']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-create',
        '/api/admin/servers',
        function (Request $request) {
            return (new ServersController())->create($request);
        },
        Permissions::ADMIN_SERVERS_CREATE,
        ['PUT']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-by-owner',
        '/api/admin/servers/owner/{ownerId}',
        function (Request $request, array $args) {
            $ownerId = $args['ownerId'] ?? null;
            if (!$ownerId || !is_numeric($ownerId)) {
                return ApiResponse::error('Missing or invalid owner ID', 'INVALID_OWNER_ID', 400);
            }

            return (new ServersController())->getByOwner($request, (int) $ownerId);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-by-node',
        '/api/admin/servers/node/{nodeId}',
        function (Request $request, array $args) {
            $nodeId = $args['nodeId'] ?? null;
            if (!$nodeId || !is_numeric($nodeId)) {
                return ApiResponse::error('Missing or invalid node ID', 'INVALID_NODE_ID', 400);
            }

            return (new ServersController())->getByNode($request, (int) $nodeId);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-by-realm',
        '/api/admin/servers/realm/{realmId}',
        function (Request $request, array $args) {
            $realmId = $args['realmId'] ?? null;
            if (!$realmId || !is_numeric($realmId)) {
                return ApiResponse::error('Missing or invalid realm ID', 'INVALID_REALM_ID', 400);
            }

            return (new ServersController())->getByRealm($request, (int) $realmId);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-by-spell',
        '/api/admin/servers/spell/{spellId}',
        function (Request $request, array $args) {
            $spellId = $args['spellId'] ?? null;
            if (!$spellId || !is_numeric($spellId)) {
                return ApiResponse::error('Missing or invalid spell ID', 'INVALID_SPELL_ID', 400);
            }

            return (new ServersController())->getBySpell($request, (int) $spellId);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-with-relations',
        '/api/admin/servers/{id}/with-relations',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid server ID', 'INVALID_SERVER_ID', 400);
            }

            return (new ServersController())->getWithRelations($request, (int) $id);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-all-with-relations',
        '/api/admin/servers/with-relations',
        function (Request $request) {
            return (new ServersController())->getAllWithRelations($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-variables',
        '/api/admin/servers/{id}/variables',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid server ID', 'INVALID_SERVER_ID', 400);
            }

            return (new ServersController())->getServerVariables($request, (int) $id);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );
};
