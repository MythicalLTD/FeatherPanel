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
