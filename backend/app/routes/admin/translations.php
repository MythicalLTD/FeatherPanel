<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
