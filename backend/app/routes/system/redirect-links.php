<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

use App\App;
use App\Helpers\ApiResponse;
use App\Controllers\System\RedirectLinks;
use Symfony\Component\HttpFoundation\Request;

return function ($routes) {
    // Get all redirect links (public API, no auth required)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'system-redirect-links-all',
        '/api/redirect-links',
        function (Request $request) {
            return (new RedirectLinks())->getAll($request);
        },
        ['GET']
    );

    // Get specific redirect link by slug (public API, no auth required)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'system-redirect-links-slug',
        '/api/redirect-links/{slug}',
        function (Request $request, array $args) {
            $slug = $args['slug'] ?? null;
            if (!$slug) {
                return ApiResponse::error('Slug parameter is required', 'MISSING_SLUG', 400);
            }

            return (new RedirectLinks())->getBySlug($request, $slug);
        },
        ['GET']
    );
};
