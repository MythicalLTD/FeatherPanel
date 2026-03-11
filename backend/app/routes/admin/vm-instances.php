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
use App\Controllers\Admin\VmInstancesController;

return function (RouteCollection $routes): void {
    // List all VM instances
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-index',
        '/api/admin/vm-instances',
        function (Request $request) {
            return (new VmInstancesController())->index($request);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Create VM instance (server) — returns 202 with creation_id; poll creation-status until active/failed
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-create',
        '/api/admin/vm-instances',
        function (Request $request) {
            return (new VmInstancesController())->create($request);
        },
        Permissions::ADMIN_NODES_CREATE,
        ['PUT']
    );

    // Poll async VM creation status (clone done → config + DB insert in this request)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-creation-status',
        '/api/admin/vm-instances/creation-status/{creationId}',
        function (Request $request, array $args) {
            $creationId = $args['creationId'] ?? '';

            return (new VmInstancesController())->creationStatus($request, $creationId);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Get single VM instance
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-show',
        '/api/admin/vm-instances/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Update VM instance
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-update',
        '/api/admin/vm-instances/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );

    // Get activity/task history for this VM instance
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-activities',
        '/api/admin/vm-instances/{id}/activities',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->activities($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Get Proxmox config (for edit page)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-config',
        '/api/admin/vm-instances/{id}/config',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->getConfig($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Get VM/container current status and resource usage (CPU, memory, disk)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-status',
        '/api/admin/vm-instances/{id}/status',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->getStatus($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Get VNC console ticket (QEMU only) for noVNC
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-vnc-ticket',
        '/api/admin/vm-instances/{id}/vnc-ticket',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->vncTicket($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Resize LXC disk
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-resize-disk',
        '/api/admin/vm-instances/{id}/resize-disk',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->resizeDisk($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );

    // Add LXC disk (mount point)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-create-disk',
        '/api/admin/vm-instances/{id}/disks',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->createDisk($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );

    // Delete LXC disk (mount point)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-delete-disk',
        '/api/admin/vm-instances/{id}/disks/{key}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $key = $args['key'] ?? '';
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->deleteDisk($request, (int) $id, $key);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['DELETE']
    );

    // Power action (start, stop, reboot)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-power',
        '/api/admin/vm-instances/{id}/power',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->power($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );

    // Reinstall VM instance — starts async clone, returns 202 + reinstall_id
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-reinstall',
        '/api/admin/vm-instances/{id}/reinstall',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->reinstall($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );

    // Poll async reinstall status
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-reinstall-status',
        '/api/admin/vm-instances/reinstall-status/{reinstallId}',
        function (Request $request, array $args) {
            $reinstallId = $args['reinstallId'] ?? '';
            if (empty($reinstallId)) {
                return ApiResponse::error('Missing reinstall_id', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->reinstallStatus($request, (string) $reinstallId);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Delete VM instance
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-delete',
        '/api/admin/vm-instances/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmInstancesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_NODES_DELETE,
        ['DELETE']
    );
};
