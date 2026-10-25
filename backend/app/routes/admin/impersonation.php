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
use RateLimit\Rate;
use App\Permissions;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\ImpersonationController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-users-impersonate',
        '/api/admin/users/{uuid}/impersonate',
        function (Request $request, array $args) {
            return (new ImpersonationController())->start($request, (string) ($args['uuid'] ?? ''));
        },
        Permissions::ADMIN_USERS_IMPERSONATE,
        ['POST'],
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-impersonation-stop',
        '/api/user/impersonation',
        function (Request $request) {
            return (new ImpersonationController())->stop($request);
        },
        ['DELETE'],
        Rate::perMinute(30),
        'user-impersonation-stop'
    );
};
