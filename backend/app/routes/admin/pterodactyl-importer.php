<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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
use App\Controllers\Admin\PterodactylImporterController;

return function (RouteCollection $routes): void {
    // Check prerequisites
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-prerequisites',
        '/api/admin/pterodactyl-importer/prerequisites',
        function (Request $request) {
            return (new PterodactylImporterController())->prerequisites($request);
        },
        Permissions::ADMIN_DATABASES_MANAGE,
    );

    // Import Pterodactyl data
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import',
        '/api/admin/pterodactyl-importer/import',
        function (Request $request) {
            return (new PterodactylImporterController())->import($request);
        },
        Permissions::ADMIN_DATABASES_MANAGE,
        ['POST'],
    );
};
