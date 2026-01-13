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
        function (Request $request, string $category) {
            return (new SettingsController())->getSettingsByCategory($category);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-settings-show',
        '/api/admin/settings/{setting}',
        function (Request $request, string $setting) {
            return (new SettingsController())->show($request, $setting);
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
};
