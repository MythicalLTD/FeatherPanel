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
use RateLimit\Rate;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\User\ApiClientController;

return function (RouteCollection $routes): void {

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-api-clients',
        '/api/user/api-clients',
        function (Request $request) {
            return (new ApiClientController())->getApiClients($request);
        },
        ['GET']
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-api-client-create',
        '/api/user/api-clients',
        function (Request $request) {
            return (new ApiClientController())->createApiClient($request);
        },
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-api-clients'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-api-client-get',
        '/api/user/api-clients/{id}',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Missing or invalid API client ID', 'INVALID_API_CLIENT_ID', 400);
            }

            return (new ApiClientController())->getApiClient($request, $id);
        },
        ['GET']
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-api-client-update',
        '/api/user/api-clients/{id}',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Missing or invalid API client ID', 'INVALID_API_CLIENT_ID', 400);
            }

            return (new ApiClientController())->updateApiClient($request, $id);
        },
        ['PUT'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-api-clients'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-api-client-delete',
        '/api/user/api-clients/{id}',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Missing or invalid API client ID', 'INVALID_API_CLIENT_ID', 400);
            }

            return (new ApiClientController())->deleteApiClient($request, $id);
        },
        ['DELETE'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-api-clients'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-api-client-regenerate-keys',
        '/api/user/api-clients/{id}/regenerate',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Missing or invalid API client ID', 'INVALID_API_CLIENT_ID', 400);
            }

            return (new ApiClientController())->regenerateApiKeys($request, $id);
        },
        ['POST'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-api-clients'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-api-client-activities',
        '/api/user/api-clients/activities',
        function (Request $request) {
            return (new ApiClientController())->getApiClientActivities($request);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-api-clients'
    );

    App::getInstance(true)->registerApiRoute(
        $routes,
        'user-api-client-validate',
        '/api/user/api-clients/validate',
        function (Request $request) {
            return (new ApiClientController())->validateApiClient($request);
        },
        ['POST'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-api-clients'
    );
};
