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
use App\Controllers\Admin\BackupSchedulesController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-backup-schedules',
        '/api/admin/backup-schedules',
        function (Request $request) {
            return (new BackupSchedulesController())->index($request);
        },
        Permissions::ADMIN_BACKUP_SCHEDULES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-backup-schedules-preview-targets',
        '/api/admin/backup-schedules/preview-targets',
        function (Request $request) {
            return (new BackupSchedulesController())->previewTargets($request);
        },
        Permissions::ADMIN_BACKUP_SCHEDULES_VIEW,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-backup-schedules-show',
        '/api/admin/backup-schedules/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new BackupSchedulesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_BACKUP_SCHEDULES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-backup-schedules-create',
        '/api/admin/backup-schedules',
        function (Request $request) {
            return (new BackupSchedulesController())->create($request);
        },
        Permissions::ADMIN_BACKUP_SCHEDULES_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-backup-schedules-update',
        '/api/admin/backup-schedules/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new BackupSchedulesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_BACKUP_SCHEDULES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-backup-schedules-delete',
        '/api/admin/backup-schedules/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new BackupSchedulesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_BACKUP_SCHEDULES_DELETE,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-backup-schedules-run',
        '/api/admin/backup-schedules/{id}/run',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new BackupSchedulesController())->runNow($request, (int) $id);
        },
        Permissions::ADMIN_BACKUP_SCHEDULES_RUN,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-backup-schedules-runs',
        '/api/admin/backup-schedules/{id}/runs',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new BackupSchedulesController())->runs($request, (int) $id);
        },
        Permissions::ADMIN_BACKUP_SCHEDULES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-backup-schedules-run-show',
        '/api/admin/backup-schedules/{id}/runs/{runId}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $runId = $args['runId'] ?? null;
            if (!$id || !is_numeric($id) || !$runId || !is_numeric($runId)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new BackupSchedulesController())->runShow($request, (int) $id, (int) $runId);
        },
        Permissions::ADMIN_BACKUP_SCHEDULES_VIEW,
    );
};
