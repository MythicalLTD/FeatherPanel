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

use App\Controllers\HomeController;
use Symfony\Component\Routing\Route;
use App\Controllers\System\WebAppController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    // GET example
    $routes->add('home', new Route('/api', [
        '_controller' => function (Request $request) {
            return (new HomeController())->index($request);
        },
        '_middleware' => [],
    ]));

    $routes->add('manifest', new Route('/api/manifest.webmanifest', [
        '_controller' => function (Request $request) {
            $response = (new WebAppController())->index($request);
            // Ensure the correct MIME type for web manifests
            $response->headers->set('Content-Type', 'application/manifest+json');

            return $response;
        },
        '_middleware' => [],
    ]));
};
