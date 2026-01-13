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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\DatabaseSnapshotsController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-database-snapshots-list',
        '/api/admin/database-snapshots',
        function (Request $request) {
            return (new DatabaseSnapshotsController())->index($request);
        },
        Permissions::ADMIN_BACKUPS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-database-snapshots-create',
        '/api/admin/database-snapshots',
        function (Request $request) {
            return (new DatabaseSnapshotsController())->create($request);
        },
        Permissions::ADMIN_BACKUPS_CREATE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-database-snapshots-download',
        '/api/admin/database-snapshots/{filename}/download',
        function (Request $request, array $args) {
            $filename = $args['filename'] ?? '';
            if (empty($filename)) {
                return \App\Helpers\ApiResponse::error('Missing filename', 'INVALID_FILENAME', 400);
            }

            return (new DatabaseSnapshotsController())->download($request, $filename);
        },
        Permissions::ADMIN_BACKUPS_DOWNLOAD,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-database-snapshots-restore',
        '/api/admin/database-snapshots/{filename}/restore',
        function (Request $request, array $args) {
            $filename = $args['filename'] ?? '';
            if (empty($filename)) {
                return \App\Helpers\ApiResponse::error('Missing filename', 'INVALID_FILENAME', 400);
            }

            return (new DatabaseSnapshotsController())->restore($request, $filename);
        },
        Permissions::ADMIN_BACKUPS_RESTORE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-database-snapshots-restore-upload',
        '/api/admin/database-snapshots/restore-upload',
        function (Request $request) {
            return (new DatabaseSnapshotsController())->restoreUpload($request);
        },
        Permissions::ADMIN_BACKUPS_RESTORE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-database-snapshots-delete',
        '/api/admin/database-snapshots/{filename}',
        function (Request $request, array $args) {
            $filename = $args['filename'] ?? '';
            if (empty($filename)) {
                return \App\Helpers\ApiResponse::error('Missing filename', 'INVALID_FILENAME', 400);
            }

            return (new DatabaseSnapshotsController())->delete($request, $filename);
        },
        Permissions::ADMIN_BACKUPS_DELETE,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-database-snapshots-fresh-restore',
        '/api/admin/database-snapshots/fresh-restore',
        function (Request $request) {
            return (new DatabaseSnapshotsController())->freshRestore($request);
        },
        Permissions::ADMIN_BACKUPS_RESTORE,
        ['POST']
    );
};
