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
use App\Permissions;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\WingsBackupsController;

return function (RouteCollection $routes): void {
    $c = fn () => new WingsBackupsController();

    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-destinations', '/api/admin/wings-backups/destinations', fn (Request $r) => $c()->destinationsIndex($r), Permissions::ADMIN_WINGS_BACKUPS_VIEW);
    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-destinations-create', '/api/admin/wings-backups/destinations', fn (Request $r) => $c()->destinationsCreate($r), Permissions::ADMIN_WINGS_BACKUPS_MANAGE, ['PUT']);
    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-destinations-update', '/api/admin/wings-backups/destinations/{id}', function (Request $r, array $args) use ($c) {
        if (!isset($args['id']) || !is_numeric($args['id'])) {
            return ApiResponse::error('Invalid ID', 'INVALID_ID', 400);
        }

        return $c()->destinationsUpdate($r, (int) $args['id']);
    }, Permissions::ADMIN_WINGS_BACKUPS_MANAGE, ['PATCH']);
    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-destinations-delete', '/api/admin/wings-backups/destinations/{id}', function (Request $r, array $args) use ($c) {
        if (!isset($args['id']) || !is_numeric($args['id'])) {
            return ApiResponse::error('Invalid ID', 'INVALID_ID', 400);
        }

        return $c()->destinationsDelete($r, (int) $args['id']);
    }, Permissions::ADMIN_WINGS_BACKUPS_MANAGE, ['DELETE']);
    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-destinations-test', '/api/admin/wings-backups/destinations/{id}/test', function (Request $r, array $args) use ($c) {
        if (!isset($args['id']) || !is_numeric($args['id'])) {
            return ApiResponse::error('Invalid ID', 'INVALID_ID', 400);
        }

        return $c()->destinationsTest($r, (int) $args['id']);
    }, Permissions::ADMIN_WINGS_BACKUPS_MANAGE, ['POST']);
    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-destinations-purge', '/api/admin/wings-backups/destinations/{id}/purge', function (Request $r, array $args) use ($c) {
        if (!isset($args['id']) || !is_numeric($args['id'])) {
            return ApiResponse::error('Invalid ID', 'INVALID_ID', 400);
        }

        return $c()->destinationsPurge($r, (int) $args['id']);
    }, Permissions::ADMIN_WINGS_BACKUPS_MANAGE, ['POST']);

    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-policies', '/api/admin/wings-backups/policies', fn (Request $r) => $c()->policiesIndex($r), Permissions::ADMIN_WINGS_BACKUPS_VIEW);
    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-policies-create', '/api/admin/wings-backups/policies', fn (Request $r) => $c()->policiesCreate($r), Permissions::ADMIN_WINGS_BACKUPS_MANAGE, ['PUT']);
    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-policies-show', '/api/admin/wings-backups/policies/{id}', function (Request $r, array $args) use ($c) {
        if (!isset($args['id']) || !is_numeric($args['id'])) {
            return ApiResponse::error('Invalid ID', 'INVALID_ID', 400);
        }

        return $c()->policiesShow($r, (int) $args['id']);
    }, Permissions::ADMIN_WINGS_BACKUPS_VIEW);
    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-policies-update', '/api/admin/wings-backups/policies/{id}', function (Request $r, array $args) use ($c) {
        if (!isset($args['id']) || !is_numeric($args['id'])) {
            return ApiResponse::error('Invalid ID', 'INVALID_ID', 400);
        }

        return $c()->policiesUpdate($r, (int) $args['id']);
    }, Permissions::ADMIN_WINGS_BACKUPS_MANAGE, ['PATCH']);
    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-policies-delete', '/api/admin/wings-backups/policies/{id}', function (Request $r, array $args) use ($c) {
        if (!isset($args['id']) || !is_numeric($args['id'])) {
            return ApiResponse::error('Invalid ID', 'INVALID_ID', 400);
        }

        return $c()->policiesDelete($r, (int) $args['id']);
    }, Permissions::ADMIN_WINGS_BACKUPS_MANAGE, ['DELETE']);
    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-policies-run', '/api/admin/wings-backups/policies/{id}/run', function (Request $r, array $args) use ($c) {
        if (!isset($args['id']) || !is_numeric($args['id'])) {
            return ApiResponse::error('Invalid ID', 'INVALID_ID', 400);
        }

        return $c()->policiesRun($r, (int) $args['id']);
    }, Permissions::ADMIN_WINGS_BACKUPS_RUN, ['POST']);
    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-policies-runs', '/api/admin/wings-backups/policies/{id}/runs', function (Request $r, array $args) use ($c) {
        if (!isset($args['id']) || !is_numeric($args['id'])) {
            return ApiResponse::error('Invalid ID', 'INVALID_ID', 400);
        }

        return $c()->policiesRuns($r, (int) $args['id']);
    }, Permissions::ADMIN_WINGS_BACKUPS_VIEW);
    App::getInstance(true)->registerAdminRoute($routes, 'admin-wings-backups-policies-run-show', '/api/admin/wings-backups/policies/{id}/runs/{runId}', function (Request $r, array $args) use ($c) {
        if (!isset($args['id'], $args['runId']) || !is_numeric($args['id']) || !is_numeric($args['runId'])) {
            return ApiResponse::error('Invalid ID', 'INVALID_ID', 400);
        }

        return $c()->policiesRunShow($r, (int) $args['id'], (int) $args['runId']);
    }, Permissions::ADMIN_WINGS_BACKUPS_VIEW);
};
