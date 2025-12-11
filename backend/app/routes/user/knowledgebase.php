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
use RateLimit\Rate;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\KnowledgebaseController;

return function (RouteCollection $routes): void {
    // GET - GET /api/user/knowledgebase/categories
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-knowledgebase-categories',
        '/api/user/knowledgebase/categories',
        function (Request $request) {
            return (new KnowledgebaseController())->categoriesIndex($request);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-knowledgebase'
    );

    // GET - GET /api/user/knowledgebase/categories/{id}
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-knowledgebase-categories-show',
        '/api/user/knowledgebase/categories/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return \App\Helpers\ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->categoriesShow($request, (int) $id);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-knowledgebase'
    );

    // GET - GET /api/user/knowledgebase/articles
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-knowledgebase-articles',
        '/api/user/knowledgebase/articles',
        function (Request $request) {
            return (new KnowledgebaseController())->articlesIndex($request);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-knowledgebase'
    );

    // GET - GET /api/user/knowledgebase/articles/{id}
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-knowledgebase-articles-show',
        '/api/user/knowledgebase/articles/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return \App\Helpers\ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->articlesShow($request, (int) $id);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-knowledgebase'
    );

    // GET - GET /api/user/knowledgebase/categories/{id}/articles
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-knowledgebase-categories-articles',
        '/api/user/knowledgebase/categories/{id}/articles',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return \App\Helpers\ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new KnowledgebaseController())->categoryArticles($request, (int) $id);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-knowledgebase'
    );
};
