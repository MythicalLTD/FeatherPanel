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
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-firewall'
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
        ['PUT'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-firewall'
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
        ['DELETE'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-server-firewall'
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
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-server-firewall'
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
        ['POST'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-server-firewall'
    );
};
