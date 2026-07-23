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

use Symfony\Component\Routing\Route;
use App\Middleware\PanelAccessSoftMiddleware;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\System\SettingsController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    // Public for panel UI; when Mythic sends cloud_api_key/secret headers they are validated.
    $routes->add('settings', new Route(
        '/api/system/settings',
        [
            '_controller' => static function (Request $request) {
                return (new SettingsController())->index($request);
            },
            '_middleware' => [PanelAccessSoftMiddleware::class],
        ],
        [],
        [],
        '',
        [],
        ['GET']
    ));
};
