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
use App\Controllers\User\Auth\LdapController;

return function (RouteCollection $routes): void {
    // LDAP login
    App::getInstance(true)->registerApiRoute(
        $routes,
        'user-ldap-login',
        '/api/user/auth/ldap/login',
        function (Request $request) {
            return (new LdapController())->login($request);
        },
        ['PUT']
    );
};
