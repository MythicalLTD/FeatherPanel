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

    // Node Network (alias for IPs with different response format)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'wings-node-network',
        '/api/wings/admin/node/{id}/network',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WingsAdminController())->getNetwork($request, (int) $id);
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

    // List Modules
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'wings-node-modules-list',
        '/api/wings/admin/node/{id}/modules',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WingsAdminController())->listModules($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Get Module Config
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'wings-node-module-config-get',
        '/api/wings/admin/node/{id}/modules/{module}/config',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $module = $args['module'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }
            if (!$module || !is_string($module)) {
                return ApiResponse::error('Missing or invalid module name', 'INVALID_MODULE', 400);
            }

            return (new WingsAdminController())->getModuleConfig($request, (int) $id, $module);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Update Module Config
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'wings-node-module-config-update',
        '/api/wings/admin/node/{id}/modules/{module}/config',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $module = $args['module'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }
            if (!$module || !is_string($module)) {
                return ApiResponse::error('Missing or invalid module name', 'INVALID_MODULE', 400);
            }

            return (new WingsAdminController())->updateModuleConfig($request, (int) $id, $module);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PUT']
    );

    // Enable Module
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'wings-node-module-enable',
        '/api/wings/admin/node/{id}/modules/{module}/enable',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $module = $args['module'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }
            if (!$module || !is_string($module)) {
                return ApiResponse::error('Missing or invalid module name', 'INVALID_MODULE', 400);
            }

            return (new WingsAdminController())->enableModule($request, (int) $id, $module);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );

    // Disable Module
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'wings-node-module-disable',
        '/api/wings/admin/node/{id}/modules/{module}/disable',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $module = $args['module'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }
            if (!$module || !is_string($module)) {
                return ApiResponse::error('Missing or invalid module name', 'INVALID_MODULE', 400);
            }

            return (new WingsAdminController())->disableModule($request, (int) $id, $module);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );
};
