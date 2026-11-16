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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\System\ObservabilityController;

return function (RouteCollection $routes): void {
    // Prometheus scrape target. Not session-authenticated and not rate limited: access is
    // decided by the metrics token / IP allowlist configured under Admin > Observability.
    $routes->add('system-metrics', new Route(
        '/api/system/metrics',
        [
            '_controller' => static function (Request $request) {
                return (new ObservabilityController())->metrics($request);
            },
        ],
        [],
        [],
        '',
        [],
        ['GET']
    ));

    // Orchestrator probes (Kubernetes, Docker, load balancers): public, no rate limit.
    $routes->add('health-live', new Route(
        '/api/health/live',
        [
            '_controller' => static function (Request $request) {
                return (new ObservabilityController())->live($request);
            },
        ],
        [],
        [],
        '',
        [],
        ['GET', 'HEAD']
    ));

    $routes->add('health-ready', new Route(
        '/api/health/ready',
        [
            '_controller' => static function (Request $request) {
                return (new ObservabilityController())->ready($request);
            },
        ],
        [],
        [],
        '',
        [],
        ['GET', 'HEAD']
    ));
};
