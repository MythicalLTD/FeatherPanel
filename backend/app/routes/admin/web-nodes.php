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
use App\Controllers\Admin\WebNodesController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes',
        '/api/admin/web-nodes',
        function (Request $request) {
            return (new WebNodesController())->index($request);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-show',
        '/api/admin/web-nodes/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-create',
        '/api/admin/web-nodes',
        function (Request $request) {
            return (new WebNodesController())->create($request);
        },
        Permissions::ADMIN_NODES_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-update',
        '/api/admin/web-nodes/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-delete',
        '/api/admin/web-nodes/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_NODES_DELETE,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-reset-token',
        '/api/admin/web-nodes/{id}/reset-token',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->resetToken($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-setup-command',
        '/api/admin/web-nodes/{id}/setup-command',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->getSetupCommand($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-config',
        '/api/admin/web-nodes/{id}/config',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->getConfig($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-health',
        '/api/admin/web-nodes/{id}/health',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->healthCheck($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-system',
        '/api/admin/web-nodes/{id}/system',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->systemInfo($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-utilization',
        '/api/admin/web-nodes/{id}/utilization',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->utilization($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-diagnostics',
        '/api/admin/web-nodes/{id}/diagnostics',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->diagnostics($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-system-logs',
        '/api/admin/web-nodes/{id}/system-logs',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->systemLogs($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-system-log-file',
        '/api/admin/web-nodes/{id}/system-logs/{file}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $file = $args['file'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }
            if (!$file || !is_string($file)) {
                return ApiResponse::error('Missing log file name', 'INVALID_FILE', 400);
            }

            return (new WebNodesController())->systemLogFile($request, (int) $id, $file);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-packages',
        '/api/admin/web-nodes/{id}/packages',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->packages($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-packages-socket',
        '/api/admin/web-nodes/{id}/packages/socket',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->packageSocket($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-packages-install',
        '/api/admin/web-nodes/{id}/packages/{packageId}/install',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $packageId = $args['packageId'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }
            if (!$packageId || !is_string($packageId)) {
                return ApiResponse::error('Missing package id', 'INVALID_PACKAGE', 400);
            }

            return (new WebNodesController())->installPackage($request, (int) $id, $packageId);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-packages-remove',
        '/api/admin/web-nodes/{id}/packages/{packageId}/remove',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $packageId = $args['packageId'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }
            if (!$packageId || !is_string($packageId)) {
                return ApiResponse::error('Missing package id', 'INVALID_PACKAGE', 400);
            }

            return (new WebNodesController())->removePackage($request, (int) $id, $packageId);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-version-status',
        '/api/admin/web-nodes/{id}/version-status',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->versionStatus($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-web-nodes-self-update',
        '/api/admin/web-nodes/{id}/self-update',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebNodesController())->triggerSelfUpdate($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );
};
