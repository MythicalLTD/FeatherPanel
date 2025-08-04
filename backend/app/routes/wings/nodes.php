<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

use App\App;
use App\Permissions;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Wings\WingsAdminController;

return function (RouteCollection $routes): void {
    // Wings Admin Index
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'wings-admin-index',
        '/api/wings/admin',
        function (Request $request, array $args) {
            return (new WingsAdminController())->index($request);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Node System Information
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'wings-node-system',
        '/api/wings/admin/node/{id}/system',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WingsAdminController())->system($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Node System Utilization
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'wings-node-utilization',
        '/api/wings/admin/node/{id}/utilization',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WingsAdminController())->utilization($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Node System IPs
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'wings-node-ips',
        '/api/wings/admin/node/{id}/ips',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WingsAdminController())->getIps($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Node Docker Disk Usage
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'wings-node-docker-disk',
        '/api/wings/admin/node/{id}/docker/disk',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WingsAdminController())->getDockerDiskUsage($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Node Docker Prune
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'wings-node-docker-prune',
        '/api/wings/admin/node/{id}/docker/prune',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WingsAdminController())->getDockerPrune($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['DELETE']
    );

};
