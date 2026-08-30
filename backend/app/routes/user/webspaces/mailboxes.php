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
use App\Controllers\User\WebSpaces\WebSpaceMailboxController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes',
        '/api/user/webspaces/{uuidShort}/mailboxes',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceMailboxController())->index($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-hosts',
        '/api/user/webspaces/{uuidShort}/mailboxes/hosts',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceMailboxController())->hosts($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-dns',
        '/api/user/webspaces/{uuidShort}/mailboxes/dns',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceMailboxController())->dns($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-deliverability',
        '/api/user/webspaces/{uuidShort}/mailboxes/deliverability',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceMailboxController())->deliverability($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-dns-provision',
        '/api/user/webspaces/{uuidShort}/mailboxes/dns/provision',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceMailboxController())->provisionDns($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(20),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-create',
        '/api/user/webspaces/{uuidShort}/mailboxes',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceMailboxController())->create($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-delete',
        '/api/user/webspaces/{uuidShort}/mailboxes/{mailboxId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $mailboxId = (int) ($args['mailboxId'] ?? 0);
            if ($uuidShort === '' || $mailboxId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceMailboxController())->delete($request, $uuidShort, $mailboxId);
        },
        ['DELETE'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-reset-password',
        '/api/user/webspaces/{uuidShort}/mailboxes/{mailboxId}/reset-password',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $mailboxId = (int) ($args['mailboxId'] ?? 0);
            if ($uuidShort === '' || $mailboxId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceMailboxController())->resetPassword($request, $uuidShort, $mailboxId);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-enabled',
        '/api/user/webspaces/{uuidShort}/mailboxes/{mailboxId}/enabled',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $mailboxId = (int) ($args['mailboxId'] ?? 0);
            if ($uuidShort === '' || $mailboxId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceMailboxController())->setEnabled($request, $uuidShort, $mailboxId);
        },
        ['PATCH'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-webmail-check',
        '/api/user/webspaces/{uuidShort}/mailboxes/webmail/check',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceMailboxController())->checkWebmailInstalled($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-webmail-token',
        '/api/user/webspaces/{uuidShort}/mailboxes/{mailboxId}/webmail/token',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $mailboxId = (int) ($args['mailboxId'] ?? 0);
            if ($uuidShort === '' || $mailboxId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceMailboxController())->generateWebmailToken($request, $uuidShort, $mailboxId);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-forwarders',
        '/api/user/webspaces/{uuidShort}/mailboxes/forwarders',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceMailboxController())->listForwarders($request, $uuidShort);
        },
        ['GET'],
        Rate::perMinute(30),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-forwarders-create',
        '/api/user/webspaces/{uuidShort}/mailboxes/forwarders',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            if ($uuidShort === '') {
                return ApiResponse::error('Missing uuidShort', 'INVALID_UUID_SHORT', 400);
            }

            return (new WebSpaceMailboxController())->createForwarder($request, $uuidShort);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-forwarders-delete',
        '/api/user/webspaces/{uuidShort}/mailboxes/forwarders/{forwarderId}',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $forwarderId = (int) ($args['forwarderId'] ?? 0);
            if ($uuidShort === '' || $forwarderId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceMailboxController())->deleteForwarder($request, $uuidShort, $forwarderId);
        },
        ['DELETE'],
        Rate::perMinute(10),
        'user-webspaces',
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-webspaces-mailboxes-autorespond',
        '/api/user/webspaces/{uuidShort}/mailboxes/{mailboxId}/autorespond',
        function (Request $request, array $args) {
            $uuidShort = (string) ($args['uuidShort'] ?? '');
            $mailboxId = (int) ($args['mailboxId'] ?? 0);
            if ($uuidShort === '' || $mailboxId <= 0) {
                return ApiResponse::error('Missing parameters', 'INVALID_PARAMETERS', 400);
            }

            return (new WebSpaceMailboxController())->setAutorespond($request, $uuidShort, $mailboxId);
        },
        ['PUT', 'PATCH'],
        Rate::perMinute(10),
        'user-webspaces',
    );
};
