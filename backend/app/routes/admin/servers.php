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
use App\Helpers\ApiResponse;
use App\Controllers\Admin\ServersController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\ServerActivitiesController;
use App\Controllers\Admin\ServerAllocationsController;

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

    // Suspend a server
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-suspend',
        '/api/admin/servers/{id}/suspend',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid server ID', 'INVALID_SERVER_ID', 400);
            }

            return (new ServersController())->suspend($request, (int) $id);
        },
        Permissions::ADMIN_SERVERS_EDIT,
        ['POST']
    );

    // Unsuspend a server
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-unsuspend',
        '/api/admin/servers/{id}/unsuspend',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid server ID', 'INVALID_SERVER_ID', 400);
            }

            return (new ServersController())->unsuspend($request, (int) $id);
        },
        Permissions::ADMIN_SERVERS_EDIT,
        ['POST']
    );

    // Server activities (paginated)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-server-activities',
        '/api/admin/server-activities',
        function (Request $request) {
            return (new ServerActivitiesController())->index($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-server-activities-by-server',
        '/api/admin/servers/{id}/activities',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid server ID', 'INVALID_SERVER_ID', 400);
            }

            return (new ServerActivitiesController())->byServer($request, (int) $id);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Server allocations - Get allocations
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-allocations',
        '/api/admin/servers/{id}/allocations',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid server ID', 'INVALID_SERVER_ID', 400);
            }

            return (new ServerAllocationsController())->getServerAllocations($request, (int) $id);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Server allocations - Assign allocation
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-allocations-assign',
        '/api/admin/servers/{id}/allocations',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid server ID', 'INVALID_SERVER_ID', 400);
            }

            return (new ServerAllocationsController())->assignAllocation($request, (int) $id);
        },
        Permissions::ADMIN_SERVERS_EDIT,
        ['POST']
    );

    // Server allocations - Delete allocation
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-allocations-delete',
        '/api/admin/servers/{serverId}/allocations/{allocationId}',
        function (Request $request, array $args) {
            $serverId = $args['serverId'] ?? null;
            $allocationId = $args['allocationId'] ?? null;

            if (!$serverId || !is_numeric($serverId)) {
                return ApiResponse::error('Missing or invalid server ID', 'INVALID_SERVER_ID', 400);
            }
            if (!$allocationId || !is_numeric($allocationId)) {
                return ApiResponse::error('Missing or invalid allocation ID', 'INVALID_ALLOCATION_ID', 400);
            }

            return (new ServerAllocationsController())->deleteAllocation($request, (int) $serverId, (int) $allocationId);
        },
        Permissions::ADMIN_SERVERS_EDIT,
        ['DELETE']
    );

    // Server allocations - Set primary
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-servers-allocations-set-primary',
        '/api/admin/servers/{serverId}/allocations/{allocationId}/primary',
        function (Request $request, array $args) {
            $serverId = $args['serverId'] ?? null;
            $allocationId = $args['allocationId'] ?? null;

            if (!$serverId || !is_numeric($serverId)) {
                return ApiResponse::error('Missing or invalid server ID', 'INVALID_SERVER_ID', 400);
            }
            if (!$allocationId || !is_numeric($allocationId)) {
                return ApiResponse::error('Missing or invalid allocation ID', 'INVALID_ALLOCATION_ID', 400);
            }

            return (new ServerAllocationsController())->setPrimaryAllocation($request, (int) $serverId, (int) $allocationId);
        },
        Permissions::ADMIN_SERVERS_EDIT,
        ['POST']
    );
};
