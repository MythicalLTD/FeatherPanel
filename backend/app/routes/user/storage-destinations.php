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
use App\Controllers\User\Storage\BackupStreamController;
use App\Controllers\User\Storage\StorageOAuthController;
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
    $withProvider = static function (array $args, callable $fn) {
        $provider = (string) ($args['provider'] ?? '');
        if (!preg_match('/^[a-z0-9]{2,20}$/', $provider)) {
            return ApiResponse::error('Unknown storage provider', 'PROVIDER_UNKNOWN', 400);
        }

        return $fn($provider);
    };

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-storage-destination-oauth-start',
        '/api/user/storage-destinations/oauth/{provider}/start',
        function (Request $request, array $args) use ($withProvider) {
            return $withProvider($args, fn (string $p) => (new StorageOAuthController())->start($request, $p));
        },
        ['POST'],
        Rate::perMinute(10),
        'user-storage-destination-write'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-storage-destination-oauth-callback',
        '/api/user/storage-destinations/oauth/{provider}/callback',
        function (Request $request, array $args) use ($withProvider) {
            return $withProvider($args, fn (string $p) => (new StorageOAuthController())->callback($request, $p));
        },
        ['GET'],
        Rate::perMinute(20),
        'user-storage-destination-write'
    );

    // Signed, expiring link (no session): browser downloads of cloud-stored backups.
    App::getInstance(true)->registerApiRoute(
        $routes,
        'storage-backup-stream',
        '/api/storage/backups/{uuid}/download',
        function (Request $request, array $args) {
            $uuid = (string) ($args['uuid'] ?? '');
            if (!preg_match('/^[a-f0-9-]{36}$/', $uuid)) {
                return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
            }

            return (new BackupStreamController())->download($request, $uuid);
        },
        ['GET'],
        Rate::perMinute(30),
        'storage-backup-stream'
    );
};
