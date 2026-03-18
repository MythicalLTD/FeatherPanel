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
use RateLimit\Rate;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Vds\VmUserBackupController;
use App\Controllers\User\Vds\VmUserInstanceController;

return function (RouteCollection $routes): void {

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-vm-instances',
        '/api/user/vm-instances',
        function (Request $request) {
            return (new VmUserInstanceController())->getUserVmInstances($request);
        },
        ['GET'],
        Rate::perSecond(2),
        'user-vm-instances'
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-get',
        '/api/user/vm-instances/{id}',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserInstanceController())->getVmInstance($request, $id);
        },
        'id',
        ['GET'],
        Rate::perMinute(30)
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-status',
        '/api/user/vm-instances/{id}/status',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserInstanceController())->getVmInstanceStatus($request, $id);
        },
        'id',
        ['GET'],
        Rate::perMinute(30)
    );

    // QEMU hardware settings: EFI + TPM (bios/efidisk0/tpmstate0)
    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-qemu-hardware-get',
        '/api/user/vm-instances/{id}/qemu-hardware',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserInstanceController())->getQemuHardware($request, $id);
        },
        'id',
        ['GET'],
        Rate::perMinute(30)
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-qemu-hardware-patch',
        '/api/user/vm-instances/{id}/qemu-hardware',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserInstanceController())->patchQemuHardware($request, $id);
        },
        'id',
        ['PATCH'],
        Rate::perMinute(10)
    );

    // Network + DNS options (free IPs, current DNS)
    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-network-options',
        '/api/user/vm-instances/{id}/network-options',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserInstanceController())->getNetworkOptions($request, $id);
        },
        'id',
        ['GET'],
        Rate::perMinute(30)
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-network-dns-patch',
        '/api/user/vm-instances/{id}/network-dns',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserInstanceController())->patchNetworkDns($request, $id);
        },
        'id',
        ['PATCH'],
        Rate::perMinute(10)
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-templates',
        '/api/user/vm-instances/{id}/templates',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserInstanceController())->getTemplates($request, $id);
        },
        'id',
        ['GET'],
        Rate::perMinute(30)
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-power',
        '/api/user/vm-instances/{id}/power',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserInstanceController())->powerAction($request, $id);
        },
        'id',
        ['POST'],
        Rate::perMinute(10)
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-vnc',
        '/api/user/vm-instances/{id}/vnc-ticket',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserInstanceController())->getVncTicket($request, $id);
        },
        'id',
        ['GET'],
        Rate::perMinute(10)
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-reinstall',
        '/api/user/vm-instances/{id}/reinstall',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserInstanceController())->reinstall($request, $id);
        },
        'id',
        ['POST'],
        Rate::perMinute(5)
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-vm-instance-reinstall-status',
        '/api/user/vm-instances/reinstall-status/{reinstallId}',
        function (Request $request, array $args) {
            $reinstallId = isset($args['reinstallId']) ? trim((string) $args['reinstallId']) : '';

            return (new VmUserInstanceController())->reinstallStatus($request, $reinstallId);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-vm-instances'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-vm-instance-task-status',
        '/api/user/vm-instances/task-status/{taskId}',
        function (Request $request, array $args) {
            $taskId = isset($args['taskId']) ? trim((string) $args['taskId']) : '';

            return (new VmUserInstanceController())->taskStatus($request, $taskId);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-vm-instances'
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-backups-list',
        '/api/user/vm-instances/{id}/backups',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserBackupController())->listBackups($request, $id);
        },
        'id',
        ['GET'],
        Rate::perMinute(30)
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-backup-create',
        '/api/user/vm-instances/{id}/backups',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserBackupController())->createBackup($request, $id);
        },
        'id',
        ['POST'],
        Rate::perMinute(10)
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-vm-instance-backup-status',
        '/api/user/vm-instances/backup-status/{backupId}',
        function (Request $request, array $args) {
            $backupId = isset($args['backupId']) ? trim((string) $args['backupId']) : '';

            return (new VmUserBackupController())->backupStatus($request, $backupId);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-vm-instances'
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-backup-delete',
        '/api/user/vm-instances/{id}/backups',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserBackupController())->deleteBackup($request, $id);
        },
        'id',
        ['DELETE'],
        Rate::perMinute(10)
    );

    App::getInstance(true)->registerVmInstanceRoute(
        $routes,
        'user-vm-instance-restore-backup',
        '/api/user/vm-instances/{id}/backups/restore',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid VM instance ID', 'INVALID_ID', 400);
            }

            return (new VmUserBackupController())->restoreBackup($request, $id);
        },
        'id',
        ['POST'],
        Rate::perMinute(5)
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-vm-instance-restore-status',
        '/api/user/vm-instances/restore-status/{restoreId}',
        function (Request $request, array $args) {
            $restoreId = isset($args['restoreId']) ? trim((string) $args['restoreId']) : '';

            return (new VmUserBackupController())->restoreBackupStatus($request, $restoreId);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-vm-instances'
    );
};
