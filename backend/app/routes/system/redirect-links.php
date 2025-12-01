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
