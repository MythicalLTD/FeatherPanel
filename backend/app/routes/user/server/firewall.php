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
use App\Chat\Server;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Server\ServerFirewallController;

return function (RouteCollection $routes): void {
    // List firewall rules
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-firewall-list',
        '/api/user/servers/{uuidShort}/firewall',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerFirewallController())->listRules($request, (int) $server['id']);
        },
        'uuidShort',
        ['GET']
    );

    // Create firewall rule
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-firewall-create',
        '/api/user/servers/{uuidShort}/firewall',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerFirewallController())->createRule($request, (int) $server['id']);
        },
        'uuidShort',
        ['POST']
    );

    // Update firewall rule
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-firewall-update',
        '/api/user/servers/{uuidShort}/firewall/{ruleId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $ruleId = $args['ruleId'] ?? null;

            if (!$uuidShort || !$ruleId || !is_numeric($ruleId)) {
                return ApiResponse::error('Missing or invalid UUID short or rule ID', 'INVALID_PARAMETERS', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerFirewallController())->updateRule($request, (int) $server['id'], (int) $ruleId);
        },
        'uuidShort',
        ['PUT']
    );

    // Delete firewall rule
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-firewall-delete',
        '/api/user/servers/{uuidShort}/firewall/{ruleId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $ruleId = $args['ruleId'] ?? null;

            if (!$uuidShort || !$ruleId || !is_numeric($ruleId)) {
                return ApiResponse::error('Missing or invalid UUID short or rule ID', 'INVALID_PARAMETERS', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerFirewallController())->deleteRule($request, (int) $server['id'], (int) $ruleId);
        },
        'uuidShort',
        ['DELETE']
    );

    // Get rules by port
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-firewall-by-port',
        '/api/user/servers/{uuidShort}/firewall/port/{port}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $port = $args['port'] ?? null;

            if (!$uuidShort || !$port || !is_numeric($port)) {
                return ApiResponse::error('Missing or invalid UUID short or port', 'INVALID_PARAMETERS', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerFirewallController())->getRulesByPort($request, (int) $server['id'], (int) $port);
        },
        'uuidShort',
        ['GET']
    );

    // Sync firewall rules
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-firewall-sync',
        '/api/user/servers/{uuidShort}/firewall/sync',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerFirewallController())->syncRules($request, (int) $server['id']);
        },
        'uuidShort',
        ['POST']
    );
};
