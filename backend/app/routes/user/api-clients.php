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
        ['POST']
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
        ['PUT']
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
        ['DELETE']
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
        ['POST']
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-api-client-activities',
        '/api/user/api-clients/activities',
        function (Request $request) {
            return (new ApiClientController())->getApiClientActivities($request);
        },
        ['GET']
    );

    App::getInstance(true)->registerApiRoute(
        $routes,
        'user-api-client-validate',
        '/api/user/api-clients/validate',
        function (Request $request) {
            return (new ApiClientController())->validateApiClient($request);
        },
        ['POST']
    );

};
