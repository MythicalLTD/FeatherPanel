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
use App\Controllers\Admin\SettingsController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-telemetry-status',
        '/api/admin/settings/telemetry/status',
        function (Request $request) {
            return (new SettingsController())->telemetryStatus($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings',
        '/api/admin/settings',
        function (Request $request) {
            return (new SettingsController())->index($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-categories',
        '/api/admin/settings/categories',
        function (Request $request) {
            return (new SettingsController())->categories($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-category',
        '/api/admin/settings/category/{category}',
        function (Request $request, array $args) {
            return (new SettingsController())->getSettingsByCategory((string) ($args['category'] ?? ''));
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-show',
        '/api/admin/settings/{setting}',
        function (Request $request, array $args) {
            return (new SettingsController())->show($request, (string) ($args['setting'] ?? ''));
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-update',
        '/api/admin/settings',
        function (Request $request) {
            return (new SettingsController())->update($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PATCH']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-chatbot-system-prompt',
        '/api/admin/settings/chatbot/system-prompt',
        function (Request $request) {
            return (new SettingsController())->getSystemPrompt($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-upload-image',
        '/api/admin/settings/upload-image',
        function (Request $request) {
            return (new SettingsController())->uploadImage($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-email-test',
        '/api/admin/settings/email/test',
        function (Request $request) {
            return (new SettingsController())->sendTestEmail($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-backup-storage-test',
        '/api/admin/settings/backup-storage/test',
        function (Request $request) {
            if (!\App\Services\Storage\StorageSettings::globalS3Configured()) {
                return \App\Helpers\ApiResponse::error('Enable S3 backup storage and fill bucket, access key and secret key first', 'S3_NOT_CONFIGURED', 400);
            }
            try {
                (new \App\Services\Storage\S3ObjectStore(\App\Services\Storage\StorageSettings::globalS3Config()))->test();
            } catch (Throwable $e) {
                return \App\Helpers\ApiResponse::error('S3 test failed: ' . $e->getMessage(), 'S3_TEST_FAILED', 400);
            }

            return \App\Helpers\ApiResponse::success(null, 'S3 storage works: wrote and deleted a test object');
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-docker-update',
        '/api/admin/settings/docker/update',
        function (Request $request) {
            return (new SettingsController())->triggerDockerUpdate($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST']
    );
};
