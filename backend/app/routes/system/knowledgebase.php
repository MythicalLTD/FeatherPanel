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
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\KnowledgebaseController;

return function (RouteCollection $routes): void {
    // GET - GET /api/knowledgebase/categories (public, no auth required)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'public-knowledgebase-categories',
        '/api/knowledgebase/categories',
        function (Request $request) {
            return (new KnowledgebaseController())->categoriesIndex($request);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'public-knowledgebase'
    );

    // GET - GET /api/knowledgebase/categories/{id} (public, no auth required)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'public-knowledgebase-categories-show',
        '/api/knowledgebase/categories/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->categoriesShow($request, (int) $id);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'public-knowledgebase'
    );

    // GET - GET /api/knowledgebase/articles (public, no auth required)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'public-knowledgebase-articles',
        '/api/knowledgebase/articles',
        function (Request $request) {
            return (new KnowledgebaseController())->articlesIndex($request);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'public-knowledgebase'
    );

    // GET - GET /api/knowledgebase/articles/{id} (public, no auth required)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'public-knowledgebase-articles-show',
        '/api/knowledgebase/articles/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->articlesShow($request, (int) $id);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'public-knowledgebase'
    );

    // GET - GET /api/knowledgebase/categories/{id}/articles (public, no auth required)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'public-knowledgebase-categories-articles',
        '/api/knowledgebase/categories/{id}/articles',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->categoryArticles($request, (int) $id);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'public-knowledgebase'
    );
};
