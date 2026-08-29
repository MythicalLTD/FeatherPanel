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
use App\Controllers\Admin\WebSpacesController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces',
        '/api/admin/webspaces',
        function (Request $request) {
            return (new WebSpacesController())->index($request);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-show',
        '/api/admin/webspaces/{uuid}',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->show($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-update',
        '/api/admin/webspaces/{uuid}',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->update($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-create',
        '/api/admin/webspaces',
        function (Request $request) {
            return (new WebSpacesController())->create($request);
        },
        Permissions::ADMIN_WEBSPACES_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-delete',
        '/api/admin/webspaces/{uuid}',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->delete($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_DELETE,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-power',
        '/api/admin/webspaces/{uuid}/power',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->power($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-status',
        '/api/admin/webspaces/{uuid}/status',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->status($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-logs',
        '/api/admin/webspaces/{uuid}/logs',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->logs($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-install-logs',
        '/api/admin/webspaces/{uuid}/logs/install',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->installLogs($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-reinstall',
        '/api/admin/webspaces/{uuid}/reinstall',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->reinstall($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-ssl',
        '/api/admin/webspaces/{uuid}/ssl',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->ssl($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-ssl-renew',
        '/api/admin/webspaces/{uuid}/ssl/renew',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->renewSsl($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-check-dns',
        '/api/admin/webspaces/{uuid}/dns-check',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->checkDns($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-backups',
        '/api/admin/webspaces/{uuid}/backups',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->listBackups($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-backups-reconcile',
        '/api/admin/webspaces/{uuid}/backups/reconcile',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->reconcileBackups($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-backup-create',
        '/api/admin/webspaces/{uuid}/backup',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->createBackup($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-backup-delete',
        '/api/admin/webspaces/{uuid}/backups/{backupUuid}',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            $backupUuid = (string) ($args['backupUuid'] ?? '');
            if ($uuid === '' || $backupUuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->deleteBackup($request, $uuid, $backupUuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-backup-restore',
        '/api/admin/webspaces/{uuid}/backups/{backupUuid}/restore',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            $backupUuid = (string) ($args['backupUuid'] ?? '');
            if ($uuid === '' || $backupUuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->restoreBackup($request, $uuid, $backupUuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-backup-download',
        '/api/admin/webspaces/{uuid}/backups/{backupUuid}/download',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            $backupUuid = (string) ($args['backupUuid'] ?? '');
            if ($uuid === '' || $backupUuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->downloadBackup($request, $uuid, $backupUuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-backup-import',
        '/api/admin/webspaces/{uuid}/backups/import',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->importBackup($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-transfer-status',
        '/api/admin/webspaces/{uuid}/transfer/status',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->transferStatus($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-transfer',
        '/api/admin/webspaces/{uuid}/transfer',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->transfer($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-jwt',
        '/api/admin/webspaces/{uuid}/jwt',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->generateJwt($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-suspend',
        '/api/admin/webspaces/{uuid}/suspend',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->suspend($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-unsuspend',
        '/api/admin/webspaces/{uuid}/unsuspend',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->unsuspend($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );
};
