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
        Permissions::ADMIN_ROOT,
    );

    // Import Pterodactyl data
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import',
        '/api/admin/pterodactyl-importer/import',
        function (Request $request) {
            return (new PterodactylImporterController())->import($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    // Import Pterodactyl egg as spell
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import-egg',
        '/api/admin/pterodactyl-importer/import-egg',
        function (Request $request) {
            return (new PterodactylImporterController())->importEgg($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    // Import Pterodactyl node
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import-node',
        '/api/admin/pterodactyl-importer/import-node',
        function (Request $request) {
            return (new PterodactylImporterController())->importNode($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    // Import Pterodactyl allocation
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import-allocation',
        '/api/admin/pterodactyl-importer/import-allocation',
        function (Request $request) {
            return (new PterodactylImporterController())->importAllocation($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    // Import Pterodactyl user
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import-user',
        '/api/admin/pterodactyl-importer/import-user',
        function (Request $request) {
            return (new PterodactylImporterController())->importUser($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    // Import Pterodactyl SSH key
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import-ssh-key',
        '/api/admin/pterodactyl-importer/import-ssh-key',
        function (Request $request) {
            return (new PterodactylImporterController())->importSshKey($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    // Import Pterodactyl server
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import-server',
        '/api/admin/pterodactyl-importer/import-server',
        function (Request $request) {
            return (new PterodactylImporterController())->importServer($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    // Import Pterodactyl server database
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import-server-database',
        '/api/admin/pterodactyl-importer/import-server-database',
        function (Request $request) {
            return (new PterodactylImporterController())->importServerDatabase($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    // Import Pterodactyl backup
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import-backup',
        '/api/admin/pterodactyl-importer/import-backup',
        function (Request $request) {
            return (new PterodactylImporterController())->importBackup($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    // Import Pterodactyl subuser
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import-subuser',
        '/api/admin/pterodactyl-importer/import-subuser',
        function (Request $request) {
            return (new PterodactylImporterController())->importSubuser($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    // Import Pterodactyl schedule
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import-schedule',
        '/api/admin/pterodactyl-importer/import-schedule',
        function (Request $request) {
            return (new PterodactylImporterController())->importSchedule($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST'],
    );

    // Import Pterodactyl task
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-pterodactyl-importer-import-task',
        '/api/admin/pterodactyl-importer/import-task',
        function (Request $request) {
            return (new PterodactylImporterController())->importTask($request);
        },
        Permissions::ADMIN_SERVERS_CREATE,
        ['POST'],
    );
};
