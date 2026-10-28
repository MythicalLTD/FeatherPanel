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
use App\Controllers\User\Storage\StorageDestinationController;

return function (RouteCollection $routes): void {
    $withId = static function (array $args, callable $fn) {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return ApiResponse::error('Missing or invalid storage destination ID', 'INVALID_DESTINATION_ID', 400);
        }

        return $fn($id);
    };

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-storage-destinations',
        '/api/user/storage-destinations',
        function (Request $request) {
            return (new StorageDestinationController())->index($request);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-storage-destinations'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-storage-destination-create',
        '/api/user/storage-destinations',
        function (Request $request) {
            return (new StorageDestinationController())->create($request);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-storage-destination-write'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-storage-destination-update',
        '/api/user/storage-destinations/{id}',
        function (Request $request, array $args) use ($withId) {
            return $withId($args, fn (int $id) => (new StorageDestinationController())->update($request, $id));
        },
        ['PATCH', 'PUT'],
        Rate::perMinute(10),
        'user-storage-destination-write'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-storage-destination-delete',
        '/api/user/storage-destinations/{id}',
        function (Request $request, array $args) use ($withId) {
            return $withId($args, fn (int $id) => (new StorageDestinationController())->delete($request, $id));
        },
        ['DELETE'],
        Rate::perMinute(10),
        'user-storage-destination-write'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-storage-destination-test',
        '/api/user/storage-destinations/{id}/test',
        function (Request $request, array $args) use ($withId) {
            return $withId($args, fn (int $id) => (new StorageDestinationController())->test($request, $id));
        },
        ['POST'],
        Rate::perMinute(10),
        'user-storage-destination-test'
    );
};
