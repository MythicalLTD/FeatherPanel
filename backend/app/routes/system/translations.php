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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\System\TranslationsController;

return function (RouteCollection $routes): void {
    // Register the more specific route FIRST (before the parameterized route)
    // Otherwise /api/system/translations/languages will match /api/system/translations/{lang} with lang="languages"
    App::getInstance(true)->registerApiRoute(
        $routes,
        'translations-languages',
        '/api/system/translations/languages',
        function (Request $request) {
            return (new TranslationsController())->getLanguages($request);
        },
    );

    // Register the parameterized route AFTER the specific route
    App::getInstance(true)->registerApiRoute(
        $routes,
        'translations',
        '/api/system/translations/{lang}',
        function (Request $request, array $args) {
            $lang = $args['lang'] ?? 'en';

            return (new TranslationsController())->getTranslations($request, $lang);
        },
    );
};
