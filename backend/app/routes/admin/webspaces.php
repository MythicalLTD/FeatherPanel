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
use App\Controllers\Admin\WebSpaceDnsController;

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
        'admin-webspaces-hosting-maturity',
        '/api/admin/webspaces/hosting-maturity',
        function (Request $request) {
            return (new WebSpacesController())->hostingMaturity($request);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-hosting-setup-wizard',
        '/api/admin/webspaces/hosting-setup/wizard',
        function (Request $request) {
            return (new WebSpacesController())->hostingSetupWizard($request);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-panel-webmail-install',
        '/api/admin/webspaces/panel-webmail/install',
        function (Request $request) {
            return (new WebSpacesController())->installPanelWebmail($request);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-infrastructure-readiness',
        '/api/admin/webspaces/infrastructure-readiness',
        function (Request $request) {
            return (new WebSpacesController())->infrastructureReadiness($request);
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
        'admin-webspaces-bandwidth-reset',
        '/api/admin/webspaces/{uuid}/bandwidth/reset',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->resetBandwidth($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
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
        'admin-webspaces-install-abort',
        '/api/admin/webspaces/{uuid}/install/abort',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->abortInstall($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-sync',
        '/api/admin/webspaces/{uuid}/sync',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->sync($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-recreate-runtime',
        '/api/admin/webspaces/{uuid}/recreate-runtime',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->recreateRuntime($request, $uuid);
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
        'admin-webspaces-dns-provision',
        '/api/admin/webspaces/{uuid}/dns/provision',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->provisionDns($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-ssl-custom',
        '/api/admin/webspaces/{uuid}/ssl/custom',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->customSslStatus($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-ssl-custom-upload',
        '/api/admin/webspaces/{uuid}/ssl/custom',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->uploadCustomSsl($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-ssl-custom-delete',
        '/api/admin/webspaces/{uuid}/ssl/custom',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->deleteCustomSsl($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['DELETE']
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
        'admin-webspaces-backup-files',
        '/api/admin/webspaces/{uuid}/backups/{backupUuid}/files',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            $backupUuid = (string) ($args['backupUuid'] ?? '');
            if ($uuid === '' || $backupUuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpacesController())->listBackupFiles($request, $uuid, $backupUuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
        ['GET']
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

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-dns-zones',
        '/api/admin/webspaces/{uuid}/dns/zones',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpaceDnsController())->listZones($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-dns-hosts',
        '/api/admin/webspaces/{uuid}/dns/hosts',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpaceDnsController())->listDnsHosts($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-dns-zones-link',
        '/api/admin/webspaces/{uuid}/dns/zones',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if ($uuid === '') {
                return ApiResponse::error('Missing UUID', 'INVALID_UUID', 400);
            }

            return (new WebSpaceDnsController())->linkZone($request, $uuid);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-dns-zones-unlink',
        '/api/admin/webspaces/{uuid}/dns/zones/{zoneId}',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            $zoneId = $args['zoneId'] ?? null;
            if ($uuid === '' || !$zoneId || !is_numeric($zoneId)) {
                return ApiResponse::error('Missing UUID or zone ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceDnsController())->unlinkZone($request, $uuid, (int) $zoneId);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-dns-records',
        '/api/admin/webspaces/{uuid}/dns/zones/{zoneId}/records',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            $zoneId = $args['zoneId'] ?? null;
            if ($uuid === '' || !$zoneId || !is_numeric($zoneId)) {
                return ApiResponse::error('Missing UUID or zone ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceDnsController())->listRecords($request, $uuid, (int) $zoneId);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-dns-records-create',
        '/api/admin/webspaces/{uuid}/dns/zones/{zoneId}/records',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            $zoneId = $args['zoneId'] ?? null;
            if ($uuid === '' || !$zoneId || !is_numeric($zoneId)) {
                return ApiResponse::error('Missing UUID or zone ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceDnsController())->createRecord($request, $uuid, (int) $zoneId);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-dns-records-update',
        '/api/admin/webspaces/{uuid}/dns/zones/{zoneId}/records/{recordId}',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            $zoneId = $args['zoneId'] ?? null;
            $recordId = (string) ($args['recordId'] ?? '');
            if ($uuid === '' || !$zoneId || !is_numeric($zoneId) || $recordId === '') {
                return ApiResponse::error('Missing UUID, zone ID, or record ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceDnsController())->updateRecord($request, $uuid, (int) $zoneId, $recordId);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webspaces-dns-records-delete',
        '/api/admin/webspaces/{uuid}/dns/zones/{zoneId}/records/{recordId}',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            $zoneId = $args['zoneId'] ?? null;
            $recordId = (string) ($args['recordId'] ?? '');
            if ($uuid === '' || !$zoneId || !is_numeric($zoneId) || $recordId === '') {
                return ApiResponse::error('Missing UUID, zone ID, or record ID', 'INVALID_ID', 400);
            }

            return (new WebSpaceDnsController())->deleteRecord($request, $uuid, (int) $zoneId, $recordId);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['DELETE']
    );
};
