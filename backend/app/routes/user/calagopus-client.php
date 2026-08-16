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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\CalagopusClientCompatController;

/**
 * Calagopus VS Code extension compatibility routes (/api/client/... and /api/settings).
 */

return function (RouteCollection $routes): void {
    $app = App::getInstance(true);
    $ctrl = static fn (): CalagopusClientCompatController => new CalagopusClientCompatController();

    $app->registerAuthRoute(
        $routes,
        'calagopus-settings',
        '/api/settings',
        function (Request $request) use ($ctrl) {
            return $ctrl()->settings($request);
        },
        ['GET'],
        Rate::perMinute(60),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-account',
        '/api/client/account',
        function (Request $request) use ($ctrl) {
            return $ctrl()->account($request);
        },
        ['GET'],
        Rate::perMinute(60),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-command-snippets-list',
        '/api/client/account/command-snippets',
        function (Request $request) use ($ctrl) {
            return $ctrl()->listCommandSnippets($request);
        },
        ['GET'],
        Rate::perMinute(30),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-command-snippets-create',
        '/api/client/account/command-snippets',
        function (Request $request) use ($ctrl) {
            return $ctrl()->createCommandSnippet($request);
        },
        ['POST'],
        Rate::perMinute(20),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-command-snippets-update',
        '/api/client/account/command-snippets/{snippetUuid}',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->updateCommandSnippet($request, (string) ($args['snippetUuid'] ?? ''));
        },
        ['PATCH'],
        Rate::perMinute(20),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-command-snippets-delete',
        '/api/client/account/command-snippets/{snippetUuid}',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->deleteCommandSnippet($request, (string) ($args['snippetUuid'] ?? ''));
        },
        ['DELETE'],
        Rate::perMinute(20),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-servers-list',
        '/api/client/servers',
        function (Request $request) use ($ctrl) {
            return $ctrl()->listServers($request);
        },
        ['GET'],
        Rate::perMinute(60),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-server-get',
        '/api/client/servers/{uuid}',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->getServer($request, (string) ($args['uuid'] ?? ''));
        },
        ['GET'],
        Rate::perMinute(60),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-server-websocket',
        '/api/client/servers/{uuid}/websocket',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->getWebsocket($request, (string) ($args['uuid'] ?? ''));
        },
        ['GET'],
        Rate::perMinute(30),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-server-power',
        '/api/client/servers/{uuid}/power',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->power($request, (string) ($args['uuid'] ?? ''));
        },
        ['POST'],
        Rate::perMinute(20),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-list',
        '/api/client/servers/{uuid}/files/list',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->listFiles($request, (string) ($args['uuid'] ?? ''));
        },
        ['GET'],
        Rate::perMinute(60),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-contents',
        '/api/client/servers/{uuid}/files/contents',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->fileContents($request, (string) ($args['uuid'] ?? ''));
        },
        ['GET'],
        Rate::perMinute(60),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-write',
        '/api/client/servers/{uuid}/files/write',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->writeFile($request, (string) ($args['uuid'] ?? ''));
        },
        ['POST'],
        Rate::perMinute(60),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-upload',
        '/api/client/servers/{uuid}/files/upload',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->uploadUrl($request, (string) ($args['uuid'] ?? ''));
        },
        ['GET'],
        Rate::perMinute(30),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-download',
        '/api/client/servers/{uuid}/files/download',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->downloadUrl($request, (string) ($args['uuid'] ?? ''));
        },
        ['GET'],
        Rate::perMinute(30),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-create-directory',
        '/api/client/servers/{uuid}/files/create-directory',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->createDirectory($request, (string) ($args['uuid'] ?? ''));
        },
        ['POST'],
        Rate::perMinute(30),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-rename',
        '/api/client/servers/{uuid}/files/rename',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->rename($request, (string) ($args['uuid'] ?? ''));
        },
        ['PUT'],
        Rate::perMinute(30),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-delete',
        '/api/client/servers/{uuid}/files/delete',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->delete($request, (string) ($args['uuid'] ?? ''));
        },
        ['POST'],
        Rate::perMinute(30),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-search',
        '/api/client/servers/{uuid}/files/search',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->search($request, (string) ($args['uuid'] ?? ''));
        },
        ['POST'],
        Rate::perMinute(30),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-revisions',
        '/api/client/servers/{uuid}/files/revisions',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->listRevisions($request, (string) ($args['uuid'] ?? ''));
        },
        ['GET'],
        Rate::perMinute(30),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-revision',
        '/api/client/servers/{uuid}/files/revisions/{id}',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->revisionContents(
                $request,
                (string) ($args['uuid'] ?? ''),
                (string) ($args['id'] ?? '')
            );
        },
        ['GET'],
        Rate::perMinute(30),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-compress',
        '/api/client/servers/{uuid}/files/compress',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->compressFiles($request, (string) ($args['uuid'] ?? ''));
        },
        ['POST'],
        Rate::perMinute(10),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-decompress',
        '/api/client/servers/{uuid}/files/decompress',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->decompressArchive($request, (string) ($args['uuid'] ?? ''));
        },
        ['POST'],
        Rate::perMinute(10),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-chmod',
        '/api/client/servers/{uuid}/files/chmod',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->chmodFiles($request, (string) ($args['uuid'] ?? ''));
        },
        ['PUT'],
        Rate::perMinute(20),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-copy-many',
        '/api/client/servers/{uuid}/files/copy-many',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->copyManyFiles($request, (string) ($args['uuid'] ?? ''));
        },
        ['POST'],
        Rate::perMinute(20),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-copy-remote',
        '/api/client/servers/{uuid}/files/copy-remote',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->copyRemoteFiles($request, (string) ($args['uuid'] ?? ''));
        },
        ['POST'],
        Rate::perMinute(10),
        'calagopus-client'
    );

    $app->registerAuthRoute(
        $routes,
        'calagopus-files-operation-cancel',
        '/api/client/servers/{uuid}/files/operations/{operation}',
        function (Request $request, array $args) use ($ctrl) {
            return $ctrl()->cancelFileOperation(
                $request,
                (string) ($args['uuid'] ?? ''),
                (string) ($args['operation'] ?? '')
            );
        },
        ['DELETE'],
        Rate::perMinute(30),
        'calagopus-client'
    );
};
