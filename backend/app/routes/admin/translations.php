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
use App\Controllers\Admin\TranslationsController;

return function (RouteCollection $routes): void {
    // List all translation files
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-translations-list',
        '/api/admin/translations',
        function (Request $request) {
            return (new TranslationsController())->list($request);
        },
        Permissions::ADMIN_ROOT,
        ['GET']
    );

    // Get specific translation file
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-translations-get',
        '/api/admin/translations/{lang}',
        function (Request $request, array $args) {
            $lang = $args['lang'] ?? null;
            if (!$lang) {
                return \App\Helpers\ApiResponse::error('Missing language code', 'MISSING_LANG', 400);
            }

            return (new TranslationsController())->get($request, $lang);
        },
        Permissions::ADMIN_ROOT,
        ['GET']
    );

    // Update translation file
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-translations-update',
        '/api/admin/translations/{lang}',
        function (Request $request, array $args) {
            $lang = $args['lang'] ?? null;
            if (!$lang) {
                return \App\Helpers\ApiResponse::error('Missing language code', 'MISSING_LANG', 400);
            }

            return (new TranslationsController())->update($request, $lang);
        },
        Permissions::ADMIN_ROOT,
        ['PUT']
    );

    // Create new translation file
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-translations-create',
        '/api/admin/translations/{lang}',
        function (Request $request, array $args) {
            $lang = $args['lang'] ?? null;
            if (!$lang) {
                return \App\Helpers\ApiResponse::error('Missing language code', 'MISSING_LANG', 400);
            }

            return (new TranslationsController())->create($request, $lang);
        },
        Permissions::ADMIN_ROOT,
        ['POST']
    );

    // Delete translation file
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-translations-delete',
        '/api/admin/translations/{lang}',
        function (Request $request, array $args) {
            $lang = $args['lang'] ?? null;
            if (!$lang) {
                return \App\Helpers\ApiResponse::error('Missing language code', 'MISSING_LANG', 400);
            }

            return (new TranslationsController())->delete($request, $lang);
        },
        Permissions::ADMIN_ROOT,
        ['DELETE']
    );

    // Download translation file
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-translations-download',
        '/api/admin/translations/{lang}/download',
        function (Request $request, array $args) {
            $lang = $args['lang'] ?? null;
            if (!$lang) {
                return \App\Helpers\ApiResponse::error('Missing language code', 'MISSING_LANG', 400);
            }

            return (new TranslationsController())->download($request, $lang);
        },
        Permissions::ADMIN_ROOT,
        ['GET']
    );

    // Get enabled languages
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-translations-enabled-get',
        '/api/admin/translations/enabled',
        function (Request $request) {
            return (new TranslationsController())->getEnabled($request);
        },
        Permissions::ADMIN_ROOT,
        ['GET']
    );

    // Set enabled languages
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-translations-enabled-set',
        '/api/admin/translations/enabled',
        function (Request $request) {
            return (new TranslationsController())->setEnabled($request);
        },
        Permissions::ADMIN_ROOT,
        ['PUT']
    );

    // Enable specific language
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-translations-enable',
        '/api/admin/translations/{lang}/enable',
        function (Request $request, array $args) {
            $lang = $args['lang'] ?? null;
            if (!$lang) {
                return \App\Helpers\ApiResponse::error('Missing language code', 'MISSING_LANG', 400);
            }

            return (new TranslationsController())->enableLanguage($request, $lang);
        },
        Permissions::ADMIN_ROOT,
        ['POST']
    );

    // Disable specific language
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-translations-disable',
        '/api/admin/translations/{lang}/disable',
        function (Request $request, array $args) {
            $lang = $args['lang'] ?? null;
            if (!$lang) {
                return \App\Helpers\ApiResponse::error('Missing language code', 'MISSING_LANG', 400);
            }

            return (new TranslationsController())->disableLanguage($request, $lang);
        },
        Permissions::ADMIN_ROOT,
        ['POST']
    );

    // Upload translation file
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-translations-upload',
        '/api/admin/translations/upload',
        function (Request $request) {
            return (new TranslationsController())->upload($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST']
    );
};
