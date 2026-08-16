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

namespace App\Controllers\User;

use App\App;
use App\Chat\Node;
use App\Chat\User;
use App\Chat\Spell;
use App\Chat\Server;
use App\Permissions;
use App\Chat\Subuser;
use App\Helpers\UUIDUtils;
use App\Chat\CommandSnippet;
use App\Helpers\AppUrlHelper;
use App\Services\Wings\Wings;
use App\Helpers\ServerGateway;
use App\Config\ConfigInterface;
use App\Helpers\WingsUrlHelper;
use App\Helpers\PermissionHelper;
use App\Helpers\DaemonCapabilities;
use App\Services\Wings\Services\JwtService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\Server\LifecycleHookPowerGate;
use App\Services\Server\LifecycleHookExecutorService;

/**
 * Calagopus VS Code extension client API compatibility shim.
 *
 * Returns Calagopus-shaped JSON (not FeatherPanel {success,data} wrappers).
 */
class CalagopusClientCompatController
{
    private const DEFAULT_MAX_VIEW_SIZE = 10 * 1024 * 1024;
    private const DEFAULT_MAX_SEARCH_SIZE = 5 * 1024 * 1024;
    private const DEFAULT_MAX_SEARCH_RESULTS = 250;

    public function listServers(Request $request): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireServerReadScope($request)) !== null) {
            return $denied;
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('per_page', 25)));
        $search = trim((string) $request->query->get('search', ''));

        $servers = $this->collectAccessibleServers($user, $search);
        $total = count($servers);
        $slice = array_slice($servers, ($page - 1) * $perPage, $perPage);
        $data = [];
        foreach ($slice as $server) {
            $data[] = $this->mapServer($server, $user);
        }

        return $this->json([
            'servers' => [
                'total' => $total,
                'per_page' => $perPage,
                'page' => $page,
                'data' => $data,
            ],
        ]);
    }

    public function getServer(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireServerReadScope($request)) !== null) {
            return $denied;
        }

        $resolved = $this->resolveAccessibleServer($user, $uuid);
        if ($resolved === null) {
            return $this->error('Server not found', 404);
        }

        return $this->json(['server' => $this->mapServer($resolved, $user)]);
    }

    public function getWebsocket(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireAnyApiScope($request, 'server', ['control.console', 'control.read-console'])) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $wingsBaseUrl = WingsUrlHelper::buildFromNode($node);
            $jwtService = new JwtService(
                (string) $node['daemon_token'],
                AppUrlHelper::wingsRemoteUrl(),
                $wingsBaseUrl
            );
            $permissions = $this->serverPermissionsForJwt($request, $user, $server);
            $token = $jwtService->generateWebSocketToken(
                (string) $server['uuid'],
                (string) $user['uuid'],
                $permissions,
                [
                    'user_name' => (string) ($user['username'] ?? $user['uuid'] ?? ''),
                    'user_avatar' => $user['avatar'] ?? null,
                ]
            );

            return $this->json([
                'token' => $token,
                'url' => WingsUrlHelper::toWebSocketBaseUrl($wingsBaseUrl) . '/api/servers/' . $server['uuid'] . '/ws',
            ]);
        } catch (\Throwable $e) {
            return $this->error('Failed to generate websocket credentials: ' . $e->getMessage(), 500);
        }
    }

    public function listFiles(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.read')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        $directory = (string) $request->query->get('directory', '/');
        if ($directory === '') {
            $directory = '/';
        }
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(250, max(1, (int) $request->query->get('per_page', 100)));
        $sort = (string) $request->query->get('sort', 'name_asc');

        try {
            $wings = Wings::fromNode($node, 60);
            $response = $wings->getServer()->listDirectory((string) $server['uuid'], $directory, false, [
                'page' => $page,
                'per_page' => $perPage,
                'sort' => $sort,
            ]);
            if (!$response->isSuccessful()) {
                return $this->error('Failed to list files: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            $payload = $response->getData();
            $entriesRaw = [];
            $total = 0;
            $isPrimary = true;
            $isWritable = true;
            $isFast = false;

            if (is_array($payload)) {
                if (isset($payload['entries']) && is_array($payload['entries'])) {
                    $entriesRaw = array_values($payload['entries']);
                    $total = (int) ($payload['total'] ?? count($entriesRaw));
                    $isPrimary = (bool) ($payload['filesystem_primary'] ?? $payload['is_filesystem_primary'] ?? true);
                    $isWritable = (bool) ($payload['filesystem_writable'] ?? $payload['is_filesystem_writable'] ?? true);
                    $isFast = (bool) ($payload['filesystem_fast'] ?? $payload['is_filesystem_fast'] ?? false);
                } elseif (array_is_list($payload)) {
                    $entriesRaw = $payload;
                    $total = count($entriesRaw);
                    $offset = ($page - 1) * $perPage;
                    $entriesRaw = array_slice($entriesRaw, $offset, $perPage);
                }
            }

            $mapped = [];
            foreach ($entriesRaw as $entry) {
                if (is_array($entry)) {
                    $mapped[] = $this->mapDirectoryEntry($entry);
                }
            }

            return $this->json([
                'is_filesystem_primary' => $isPrimary,
                'is_filesystem_writable' => $isWritable,
                'is_filesystem_fast' => $isFast,
                'entries' => [
                    'total' => $total,
                    'per_page' => $perPage,
                    'page' => $page,
                    'data' => $mapped,
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->error('Failed to list files: ' . $e->getMessage(), 500);
        }
    }

    public function fileContents(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.read-content')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $file = (string) $request->query->get('file', '');
        if ($file === '') {
            return $this->error('Missing file parameter', 400);
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $wings = Wings::fromNode($node, 60);
            $response = $wings->getServer()->getFileContentsRaw((string) $server['uuid'], $file, false);
            if (!$response->isSuccessful()) {
                return $this->error('Failed to read file: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            $content = $response->getRawBody();
            if ($content === null) {
                $content = '';
            }

            return new Response($content, 200, [
                'Content-Type' => 'application/octet-stream',
            ]);
        } catch (\Throwable $e) {
            return $this->error('Failed to read file: ' . $e->getMessage(), 500);
        }
    }

    public function writeFile(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.update')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $file = (string) $request->query->get('file', '');
        if ($file === '') {
            return $this->error('Missing file parameter', 400);
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $content = $request->getContent();
            if ($content === null) {
                $content = '';
            }
            $wings = Wings::fromNode($node, 120);
            $response = $wings->getServer()->writeFile((string) $server['uuid'], $file, $content);
            if (!$response->isSuccessful()) {
                return $this->error('Failed to write file: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            return new Response('', 204);
        } catch (\Throwable $e) {
            return $this->error('Failed to write file: ' . $e->getMessage(), 500);
        }
    }

    public function power(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $data = json_decode($request->getContent(), true);
        $action = is_array($data) ? (string) ($data['action'] ?? '') : '';
        $allowed = ['start', 'stop', 'restart', 'kill'];
        if (!in_array($action, $allowed, true)) {
            return $this->error('Invalid power action', 400);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'control.' . $action)) !== null) {
            return $denied;
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        $hookExecutor = new LifecycleHookExecutorService();
        $hookResult = $hookExecutor->executeForPowerAction($server, $node, $action, $user);
        if (LifecycleHookPowerGate::isBlocked($hookResult)) {
            return $this->error(LifecycleHookPowerGate::apiErrorMessage($hookResult), 409);
        }

        try {
            $timeout = $action === 'kill' ? 60 : 30;
            $wings = Wings::fromNode($node, $timeout);
            $svc = $wings->getServer();
            $response = match ($action) {
                'start' => $svc->startServer((string) $server['uuid']),
                'stop' => $svc->stopServer((string) $server['uuid']),
                'restart' => $svc->restartServer((string) $server['uuid']),
                'kill' => $svc->killServer((string) $server['uuid']),
            };
            if (!$response->isSuccessful()) {
                return $this->error('Power action failed: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            return new Response('', 204);
        } catch (\Throwable $e) {
            return $this->error('Power action failed: ' . $e->getMessage(), 500);
        }
    }

    public function account(Request $request): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireServerReadScope($request)) !== null) {
            return $denied;
        }

        return $this->json([
            'user' => [
                'uuid' => (string) $user['uuid'],
                'username' => (string) $user['username'],
                'email' => (string) $user['email'],
            ],
        ]);
    }

    public function settings(Request $request): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireServerReadScope($request)) !== null) {
            return $denied;
        }

        $config = App::getInstance(true)->getConfig();
        $appName = $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');

        return $this->json([
            'app' => [
                'name' => $appName,
            ],
            'server' => [
                'max_file_manager_view_size' => self::DEFAULT_MAX_VIEW_SIZE,
                'max_file_manager_content_search_size' => self::DEFAULT_MAX_SEARCH_SIZE,
                'max_file_manager_search_results' => self::DEFAULT_MAX_SEARCH_RESULTS,
                'container_prelude' => '',
            ],
        ]);
    }

    public function uploadUrl(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.create')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $wingsBaseUrl = WingsUrlHelper::buildFromNode($node);
            $expiresIn = 900;
            $jwtService = new JwtService(
                (string) $node['daemon_token'],
                AppUrlHelper::wingsRemoteUrl(),
                $wingsBaseUrl,
                $expiresIn
            );
            $ignored = $this->spellDenylist($server);
            $token = $jwtService->generateFileUploadToken((string) $server['uuid'], (string) $user['uuid'], '', $ignored);
            $url = rtrim($wingsBaseUrl, '/') . '/upload/file?token=' . $token;

            return $this->json(['url' => $url]);
        } catch (\Throwable $e) {
            return $this->error('Failed to generate upload URL: ' . $e->getMessage(), 500);
        }
    }

    public function downloadUrl(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.read-content')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $root = (string) $request->query->get('root', '/');
        $filesParam = $request->query->all()['files'] ?? null;
        $files = [];
        if (is_array($filesParam)) {
            foreach ($filesParam as $f) {
                if (is_string($f) && $f !== '') {
                    $files[] = $f;
                }
            }
        } elseif (is_string($filesParam) && $filesParam !== '') {
            $files[] = $filesParam;
        }
        if ($files === []) {
            return $this->error('Missing files parameter', 400);
        }

        $name = (string) $files[0];
        $root = rtrim($root === '' ? '/' : $root, '/');
        $path = $root === '' || $root === '/' ? '/' . ltrim($name, '/') : $root . '/' . ltrim($name, '/');

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $wingsBaseUrl = WingsUrlHelper::buildFromNode($node);
            $jwtService = new JwtService(
                (string) $node['daemon_token'],
                AppUrlHelper::wingsRemoteUrl(),
                $wingsBaseUrl
            );
            $token = $jwtService->generateFileDownloadToken((string) $server['uuid'], (string) $user['uuid'], $path);
            $url = rtrim($wingsBaseUrl, '/') . '/download/file?token=' . $token
                . '&server=' . urlencode((string) $server['uuid'])
                . '&file=' . urlencode($path);

            return $this->json(['url' => $url]);
        } catch (\Throwable $e) {
            return $this->error('Failed to generate download URL: ' . $e->getMessage(), 500);
        }
    }

    public function createDirectory(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.create')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['name'])) {
            return $this->error('Missing root/name', 400);
        }
        $root = (string) ($data['root'] ?? '/');
        $name = (string) $data['name'];

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $wings = Wings::fromNode($node);
            $response = $wings->getServer()->createDirectory((string) $server['uuid'], $name, $root);
            if (!$response->isSuccessful()) {
                return $this->error('Failed to create directory: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            return new Response('', 204);
        } catch (\Throwable $e) {
            return $this->error('Failed to create directory: ' . $e->getMessage(), 500);
        }
    }

    public function rename(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.update')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['files']) || !is_array($data['files'])) {
            return $this->error('Invalid rename payload', 400);
        }
        $root = (string) ($data['root'] ?? '/');

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $wings = Wings::fromNode($node);
            $response = $wings->getServer()->renameFiles((string) $server['uuid'], $root, $data['files']);
            if (!$response->isSuccessful()) {
                return $this->error('Failed to rename: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            return new Response('', 204);
        } catch (\Throwable $e) {
            return $this->error('Failed to rename: ' . $e->getMessage(), 500);
        }
    }

    public function delete(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.delete')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['files']) || !is_array($data['files'])) {
            return $this->error('Invalid delete payload', 400);
        }
        $root = (string) ($data['root'] ?? '/');

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $options = ['permanent' => true];
            $wings = Wings::fromNode($node);
            $response = $wings->getServer()->deleteFiles((string) $server['uuid'], $root, $data['files'], $options);
            if (!$response->isSuccessful()) {
                return $this->error('Failed to delete: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            return new Response('', 204);
        } catch (\Throwable $e) {
            return $this->error('Failed to delete: ' . $e->getMessage(), 500);
        }
    }

    public function search(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.read')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            $payload = [];
        }

        try {
            $wings = Wings::fromNode($node, 120);
            $response = $wings->getServer()->searchFilesCalagopus((string) $server['uuid'], $payload);
            if (!$response->isSuccessful()) {
                return $this->error('Search failed: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            $data = $response->getData();
            $rawEntries = [];
            if (is_array($data)) {
                if (isset($data['results']) && is_array($data['results'])) {
                    $rawEntries = $data['results'];
                } elseif (isset($data['entries']) && is_array($data['entries'])) {
                    $rawEntries = $data['entries'];
                } elseif (array_is_list($data)) {
                    $rawEntries = $data;
                }
            }

            $entries = [];
            foreach ($rawEntries as $entry) {
                if (is_array($entry)) {
                    $entries[] = $this->mapDirectoryEntry($entry);
                }
            }

            return $this->json(['entries' => $entries]);
        } catch (\Throwable $e) {
            return $this->error('Search failed: ' . $e->getMessage(), 500);
        }
    }

    public function listRevisions(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.read-content')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $file = (string) $request->query->get('file', '');
        if ($file === '') {
            return $this->error('Missing file parameter', 400);
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $wings = Wings::fromNode($node);
            $response = $wings->getServer()->getFileRevisions((string) $server['uuid'], $file);
            if (!$response->isSuccessful()) {
                return $this->error('Failed to list revisions: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            $data = $response->getData();
            $raw = is_array($data) && isset($data['revisions']) && is_array($data['revisions'])
                ? $data['revisions']
                : [];

            $revisions = [];
            foreach ($raw as $rev) {
                if (!is_array($rev)) {
                    continue;
                }
                $userPayload = null;
                $userId = $rev['user'] ?? null;
                if (is_string($userId) && $userId !== '') {
                    $u = User::getUserByUuid($userId);
                    if ($u) {
                        $userPayload = [
                            'username' => (string) $u['username'],
                            'avatar' => $u['avatar'] ?? null,
                        ];
                    }
                }
                $created = $rev['created'] ?? null;
                if (is_array($created) || is_object($created)) {
                    $created = (string) json_encode($created);
                }
                $revisions[] = [
                    'id' => (int) ($rev['id'] ?? 0),
                    'user' => $userPayload,
                    'size' => (int) ($rev['size'] ?? 0),
                    'is_snapshot' => (bool) ($rev['is_snapshot'] ?? false),
                    'created' => is_string($created) ? $created : (string) ($created ?? ''),
                ];
            }

            return $this->json(['revisions' => $revisions]);
        } catch (\Throwable $e) {
            return $this->error('Failed to list revisions: ' . $e->getMessage(), 500);
        }
    }

    public function revisionContents(Request $request, string $uuid, string $id): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.read-content')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $revisionId = (int) $id;
        if ($revisionId <= 0) {
            return $this->error('Invalid revision id', 400);
        }

        $file = (string) $request->query->get('file', '');
        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $wings = Wings::fromNode($node);
            $response = $wings->getServer()->getFileRevisionContents((string) $server['uuid'], $revisionId, $file);
            if (!$response->isSuccessful()) {
                return $this->error('revision not found', $response->getStatusCode() ?: 404);
            }

            $content = $response->getRawBody();
            if ($content === null) {
                $data = $response->getData();
                $content = is_string($data) ? $data : '';
            }

            return new Response($content, 200, [
                'Content-Type' => 'application/octet-stream',
            ]);
        } catch (\Throwable $e) {
            return $this->error('revision not found', 404);
        }
    }

    public function compressFiles(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.archive')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (
            !is_array($data)
            || !isset($data['files'], $data['format'])
            || !is_array($data['files'])
            || $data['files'] === []
            || !is_string($data['format'])
            || trim($data['format']) === ''
        ) {
            return $this->error('Invalid compress payload', 400);
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $isWingsRs = DaemonCapabilities::fromNode($node)->isWingsRs();
            $wings = Wings::fromNode($node, 900);
            $response = $wings->getServer()->compressFiles(
                (string) $server['uuid'],
                (string) ($data['root'] ?? '/'),
                $data['files'],
                is_string($data['name'] ?? null) ? $data['name'] : '',
                $data['format'],
                null,
                false
            );
            if (!$response->isSuccessful()) {
                return $this->error('Failed to compress files: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            $payload = $response->getData();
            $identifier = is_array($payload) ? (string) ($payload['identifier'] ?? '') : '';
            if ($identifier === '' && $isWingsRs) {
                return $this->error('File compression did not return an operation identifier', 502);
            }

            return $this->json(['identifier' => $identifier !== '' ? $identifier : UUIDUtils::generateV4()]);
        } catch (\Throwable $e) {
            return $this->error('Failed to compress files: ' . $e->getMessage(), 500);
        }
    }

    public function decompressArchive(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.archive')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !is_string($data['file'] ?? null) || trim($data['file']) === '') {
            return $this->error('Invalid decompress payload', 400);
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $isWingsRs = DaemonCapabilities::fromNode($node)->isWingsRs();
            $wings = Wings::fromNode($node, 900);
            $response = $wings->getServer()->decompressArchive(
                (string) $server['uuid'],
                $data['file'],
                (string) ($data['root'] ?? '/'),
                null,
                false
            );
            if (!$response->isSuccessful()) {
                return $this->error('Failed to decompress archive: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            $payload = $response->getData();
            $identifier = is_array($payload) ? (string) ($payload['identifier'] ?? '') : '';
            if ($identifier === '' && $isWingsRs) {
                return $this->error('File decompression did not return an operation identifier', 502);
            }

            return $this->json(['identifier' => $identifier !== '' ? $identifier : UUIDUtils::generateV4()]);
        } catch (\Throwable $e) {
            return $this->error('Failed to decompress archive: ' . $e->getMessage(), 500);
        }
    }

    public function chmodFiles(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.update')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['files']) || !is_array($data['files'])) {
            return $this->error('Invalid chmod payload', 400);
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $wings = Wings::fromNode($node);
            $response = $wings->getServer()->changeFilePermissions(
                (string) $server['uuid'],
                (string) ($data['root'] ?? '/'),
                $data['files']
            );
            if (!$response->isSuccessful()) {
                return $this->error('Failed to change file permissions: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            $payload = $response->getData();
            $updated = is_array($payload) && isset($payload['updated'])
                ? (int) $payload['updated']
                : count($data['files']);

            return $this->json(['updated' => $updated]);
        } catch (\Throwable $e) {
            return $this->error('Failed to change file permissions: ' . $e->getMessage(), 500);
        }
    }

    public function copyManyFiles(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.update')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['files']) || !is_array($data['files']) || $data['files'] === []) {
            return $this->error('Invalid copy-many payload', 400);
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $isWingsRs = DaemonCapabilities::fromNode($node)->isWingsRs();
            $wings = Wings::fromNode($node, 900);
            $response = $wings->getServer()->copyManyFiles(
                (string) $server['uuid'],
                (string) ($data['root'] ?? '/'),
                $data['files'],
                (bool) ($data['overwrite'] ?? false),
                false
            );
            if (!$response->isSuccessful()) {
                return $this->error('Failed to copy files: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            $payload = $response->getData();
            $identifier = is_array($payload) ? (string) ($payload['identifier'] ?? '') : '';
            if ($identifier === '' && $isWingsRs) {
                return $this->error('File copy did not return an operation identifier', 502);
            }

            $skipped = [];
            $rawSkipped = is_array($payload) && is_array($payload['skipped'] ?? null) ? $payload['skipped'] : [];
            foreach ($rawSkipped as $entry) {
                if (is_array($entry)) {
                    $skipped[] = $this->mapDirectoryEntry($entry);
                }
            }

            return $this->json([
                'identifier' => $identifier !== '' ? $identifier : UUIDUtils::generateV4(),
                'skipped' => $skipped,
            ]);
        } catch (\Throwable $e) {
            return $this->error('Failed to copy files: ' . $e->getMessage(), 500);
        }
    }

    public function copyRemoteFiles(Request $request, string $uuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.update')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (
            !is_array($data)
            || !isset($data['files'], $data['destination_server'])
            || !is_array($data['files'])
            || $data['files'] === []
            || !is_string($data['destination_server'])
        ) {
            return $this->error('Invalid copy-remote payload', 400);
        }

        $destinationServer = $this->resolveAccessibleServer($user, $data['destination_server']);
        if ($destinationServer === null) {
            return $this->error('Destination server not found', 404);
        }

        $sourceNode = Node::getNodeById((int) $server['node_id']);
        $destinationNode = Node::getNodeById((int) $destinationServer['node_id']);
        if (!$sourceNode || !$destinationNode) {
            return $this->error('Source or destination node not found', 404);
        }

        $sourceRoot = (string) ($data['root'] ?? '/');
        $destinationPath = (string) ($data['destination'] ?? '/');
        $foreground = (bool) ($data['foreground'] ?? true);
        $files = [];
        foreach ($data['files'] as $file) {
            if (!is_array($file) || !is_string($file['from'] ?? null) || !is_string($file['to'] ?? null)) {
                continue;
            }
            $from = trim($file['from']);
            $to = trim($file['to']);
            if ($from === '' || $to === '' || !$this->isSafeRelativePath($from) || !$this->isSafeRelativePath($to)) {
                continue;
            }
            $files[] = ['from' => $from, 'to' => $to];
        }
        if ($files === []) {
            return $this->error('Invalid copy-remote file list', 400);
        }

        $sourceIsWingsRs = DaemonCapabilities::fromNode($sourceNode)->isWingsRs();
        $destinationIsWingsRs = DaemonCapabilities::fromNode($destinationNode)->isWingsRs();

        try {
            if ($sourceIsWingsRs && $destinationIsWingsRs) {
                $url = '';
                $token = '';
                if ((int) $sourceNode['id'] !== (int) $destinationNode['id']) {
                    $destinationBaseUrl = WingsUrlHelper::buildFromNode($destinationNode);
                    $jwtService = new JwtService(
                        (string) $destinationNode['daemon_token'],
                        AppUrlHelper::wingsRemoteUrl(),
                        $destinationBaseUrl,
                        900
                    );
                    $jwt = $jwtService->generateFileTransferToken(
                        (string) $destinationServer['uuid'],
                        (string) $user['uuid'],
                        $sourceRoot,
                        $destinationPath
                    );
                    $url = rtrim($destinationBaseUrl, '/') . '/api/transfers/files';
                    $token = 'Bearer ' . $jwt;
                }

                $response = Wings::fromNode($sourceNode, 900)->getServer()->copyRemoteFiles(
                    (string) $server['uuid'],
                    $url,
                    $token,
                    $sourceRoot,
                    $files,
                    (string) $destinationServer['uuid'],
                    $destinationPath,
                    $foreground,
                    'tar_gz'
                );
                if (!$response->isSuccessful()) {
                    return $this->error('Failed to copy files: ' . $response->getError(), $response->getStatusCode() ?: 500);
                }
                $payload = $response->getData();
                $identifier = is_array($payload) ? (string) ($payload['identifier'] ?? '') : '';

                return $this->json(['identifier' => $identifier !== '' ? $identifier : UUIDUtils::generateV4()]);
            }

            $this->copyRemoteThroughPanel(
                $sourceNode,
                $server,
                $destinationNode,
                $destinationServer,
                $sourceRoot,
                $destinationPath,
                $files
            );

            return $this->json(['identifier' => UUIDUtils::generateV4()]);
        } catch (\Throwable $e) {
            return $this->error('Failed to copy files: ' . $e->getMessage(), 500);
        }
    }

    public function cancelFileOperation(Request $request, string $uuid, string $operation): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'server', 'files.update')) !== null) {
            return $denied;
        }

        $server = $this->resolveAccessibleServer($user, $uuid);
        if ($server === null) {
            return $this->error('Server not found', 404);
        }
        if ($operation === '') {
            return $this->error('Missing operation identifier', 400);
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return $this->error('Node not found', 404);
        }

        try {
            $wings = Wings::fromNode($node);
            $response = $wings->getServer()->cancelFileOperation((string) $server['uuid'], $operation);
            if (!$response->isSuccessful()) {
                return $this->error('Failed to cancel file operation: ' . $response->getError(), $response->getStatusCode() ?: 500);
            }

            return new Response('', 204);
        } catch (\Throwable $e) {
            return $this->error('Failed to cancel file operation: ' . $e->getMessage(), 500);
        }
    }

    public function listCommandSnippets(Request $request): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'user', 'command-snippets.read')) !== null) {
            return $denied;
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('per_page', 100)));
        $search = trim((string) $request->query->get('search', ''));
        $result = CommandSnippet::listByUserUuid((string) $user['uuid'], $page, $perPage, $search);
        $snippets = array_map(fn (array $row): array => $this->mapCommandSnippet($row), $result['data']);

        return $this->json([
            'command_snippets' => [
                'total' => $result['total'],
                'per_page' => $perPage,
                'page' => $page,
                'data' => $snippets,
            ],
        ]);
    }

    public function createCommandSnippet(Request $request): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'user', 'command-snippets.create')) !== null) {
            return $denied;
        }

        $data = json_decode($request->getContent(), true);
        if (!$this->validCommandSnippetPayload($data)) {
            return $this->error('Invalid command snippet payload', 400);
        }

        $uuid = UUIDUtils::generateV4();
        $id = CommandSnippet::create([
            'uuid' => $uuid,
            'user_uuid' => (string) $user['uuid'],
            'name' => $data['name'],
            'command' => $data['command'],
            'eggs' => $data['eggs'],
        ]);
        if ($id === false) {
            return $this->error('Failed to create command snippet', 500);
        }
        $snippet = CommandSnippet::getByUuid($uuid);

        return $this->json(['command_snippet' => $this->mapCommandSnippet($snippet ?? [])], 201);
    }

    public function updateCommandSnippet(Request $request, string $snippetUuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'user', 'command-snippets.update')) !== null) {
            return $denied;
        }

        $snippet = CommandSnippet::getByUuid($snippetUuid);
        if ($snippet === null || (string) $snippet['user_uuid'] !== (string) $user['uuid']) {
            return $this->error('Command snippet not found', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (!$this->validCommandSnippetPayload($data)) {
            return $this->error('Invalid command snippet payload', 400);
        }
        if (
            !CommandSnippet::updateByUuid($snippetUuid, [
                'name' => $data['name'],
                'command' => $data['command'],
                'eggs' => $data['eggs'],
            ])
        ) {
            return $this->error('Failed to update command snippet', 500);
        }

        return new Response('', 204);
    }

    public function deleteCommandSnippet(Request $request, string $snippetUuid): Response
    {
        $user = $this->user($request);
        if ($user === null) {
            return $this->error('Unauthorized', 401);
        }
        if (($denied = $this->requireApiScope($request, 'user', 'command-snippets.delete')) !== null) {
            return $denied;
        }

        $snippet = CommandSnippet::getByUuid($snippetUuid);
        if ($snippet === null || (string) $snippet['user_uuid'] !== (string) $user['uuid']) {
            return $this->error('Command snippet not found', 404);
        }
        if (!CommandSnippet::deleteByUuid($snippetUuid)) {
            return $this->error('Failed to delete command snippet', 500);
        }

        return new Response('', 204);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function user(Request $request): ?array
    {
        $user = $request->attributes->get('user');

        return is_array($user) ? $user : null;
    }

    /**
     * @param array<string, mixed> $user
     *
     * @return list<array<string, mixed>>
     */
    private function collectAccessibleServers(array $user, string $search): array
    {
        $owned = Server::getServersByOwnerId((int) $user['id']);
        $subusers = Subuser::getSubusersByUserId((int) $user['id']);
        $subuserServerIds = array_map(static fn ($s) => (int) $s['server_id'], $subusers);
        $subuserServers = [];
        if ($subuserServerIds !== []) {
            $byId = Server::getServersByIds($subuserServerIds);
            foreach ($subuserServerIds as $id) {
                if (isset($byId[$id])) {
                    $subuserServers[] = $byId[$id];
                }
            }
        }

        $all = array_merge($owned, $subuserServers);
        $seen = [];
        $unique = [];
        foreach ($all as $server) {
            $sid = (int) ($server['id'] ?? 0);
            if (isset($seen[$sid])) {
                continue;
            }
            $seen[$sid] = true;
            if ($search !== '') {
                $hay = ($server['name'] ?? '') . ' ' . ($server['description'] ?? '');
                if (stripos($hay, $search) === false) {
                    continue;
                }
            }
            $unique[] = $server;
        }

        return $unique;
    }

    /**
     * @param array<string, mixed> $user
     *
     * @return array<string, mixed>|null
     */
    private function resolveAccessibleServer(array $user, string $uuid): ?array
    {
        $server = Server::getServerByUuid($uuid);
        if (!$server) {
            $server = Server::getServerByUuidShort($uuid);
        }
        if (!$server) {
            return null;
        }
        if (!ServerGateway::canUserAccessServer((string) $user['uuid'], (string) $server['uuid'], $user, $server)) {
            return null;
        }

        return $server;
    }

    /**
     * @param array<string, mixed> $server
     * @param array<string, mixed> $user
     *
     * @return array<string, mixed>
     */
    private function mapServer(array $server, array $user): array
    {
        $isOwner = (int) ($server['owner_id'] ?? 0) === (int) ($user['id'] ?? 0);
        $node = Node::getNodeById((int) ($server['node_id'] ?? 0));
        $spell = Spell::getSpellById((int) ($server['spell_id'] ?? 0));

        $statusRaw = $server['status'] ?? null;
        $status = null;
        if (in_array($statusRaw, ['installing', 'install_failed', 'restoring_backup'], true)) {
            $status = $statusRaw;
        }

        $permissions = ['*'];
        if (!$isOwner) {
            $subuser = Subuser::getSubuserByUserAndServer((int) $user['id'], (int) $server['id']);
            $permissions = [];
            if ($subuser) {
                $decoded = json_decode($subuser['permissions'] ?? '[]', true);
                $permissions = is_array($decoded) ? array_values($decoded) : [];
            }
            if (
                PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_VIEW)
                || PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_EDIT)
                || PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_DELETE)
            ) {
                $permissions = ['*'];
            }
        }

        $suspended = ($server['suspended'] ?? 0) == 1
            || ($server['status'] ?? null) === 'suspended';

        return [
            'uuid' => (string) $server['uuid'],
            'uuid_short' => (string) ($server['uuidShort'] ?? $server['uuid_short'] ?? ''),
            'name' => (string) ($server['name'] ?? ''),
            'description' => $server['description'] ?? null,
            'status' => $status,
            'is_suspended' => (bool) $suspended,
            'is_owner' => $isOwner,
            'permissions' => $permissions,
            'node_name' => (string) ($node['name'] ?? ''),
            'egg' => [
                'uuid' => (string) ($spell['uuid'] ?? ''),
                'name' => (string) ($spell['name'] ?? 'Unknown'),
            ],
        ];
    }

    /**
     * @param array<string, mixed> $entry
     *
     * @return array<string, mixed>
     */
    private function mapDirectoryEntry(array $entry): array
    {
        $isFile = (bool) ($entry['file'] ?? !($entry['directory'] ?? false));
        $isDir = (bool) ($entry['directory'] ?? !$isFile);
        $mime = (string) ($entry['mime'] ?? $entry['mimetype'] ?? ($isDir ? 'inode/directory' : 'application/octet-stream'));
        $modified = (string) ($entry['modified'] ?? $entry['modified_at'] ?? $entry['updated_at'] ?? '');
        $created = (string) ($entry['created'] ?? $entry['created_at'] ?? $modified);
        $size = (int) ($entry['size'] ?? 0);

        return [
            'name' => (string) ($entry['name'] ?? basename((string) ($entry['path'] ?? ''))),
            'mode' => (string) ($entry['mode'] ?? ''),
            'mode_bits' => (string) ($entry['mode_bits'] ?? $entry['modeBits'] ?? '0644'),
            'size' => $size,
            'size_physical' => (int) ($entry['size_physical'] ?? $entry['sizePhysical'] ?? $size),
            'editable' => (bool) ($entry['editable'] ?? $isFile),
            'inner_editable' => (bool) ($entry['inner_editable'] ?? $entry['innerEditable'] ?? false),
            'directory' => $isDir,
            'file' => $isFile,
            'symlink' => (bool) ($entry['symlink'] ?? false),
            'mime' => $mime,
            'modified' => $modified,
            'created' => $created,
        ];
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $server
     *
     * @return list<string>
     */
    private function serverPermissionsForJwt(Request $request, array $user, array $server): array
    {
        $full = [
            'websocket.connect',
            'control.read-console',
            'control.console',
            'control.start',
            'control.stop',
            'control.restart',
            'control.kill',
            // FeatherWings / Pterodactyl-style
            'files.read',
            'files.write',
            'files.delete',
            'files.upload',
            'files.download',
            // Calagopus / collab-compatible (aliases accepted by wings-rs)
            'file.read',
            'file.read-content',
            'file.create',
            'file.update',
            'file.delete',
            'file.archive',
            'files.read-content',
            'files.create',
            'files.update',
            'files.archive',
            'admin.websocket.errors',
            'admin.websocket.install',
            'admin.websocket.transfer',
            'backup.read',
        ];

        if ((int) ($server['owner_id'] ?? 0) === (int) ($user['id'] ?? 0)) {
            return $this->intersectApiServerPermissions($request, $full);
        }

        if (
            PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_VIEW)
            || PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_EDIT)
            || PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_DELETE)
        ) {
            return $this->intersectApiServerPermissions($request, $full);
        }

        $subuser = Subuser::getSubuserByUserAndServer((int) $user['id'], (int) $server['id']);
        if (!$subuser) {
            return $this->intersectApiServerPermissions($request, ['websocket.connect']);
        }
        $perms = json_decode($subuser['permissions'] ?? '[]', true);
        if (!is_array($perms)) {
            $perms = [];
        }
        // Map FeatherPanel subuser file.* grants onto both singular and plural forms.
        $mapped = [];
        foreach ($perms as $perm) {
            if (!is_string($perm) || $perm === '') {
                continue;
            }
            $mapped[] = $perm;
            if (str_starts_with($perm, 'file.')) {
                $mapped[] = 'files.' . substr($perm, 5);
            } elseif (str_starts_with($perm, 'files.')) {
                $mapped[] = 'file.' . substr($perm, 6);
            }
        }
        $perms = array_values(array_unique($mapped));
        if (!in_array('websocket.connect', $perms, true) && !in_array('*', $perms, true)) {
            $perms[] = 'websocket.connect';
        }

        return $this->intersectApiServerPermissions($request, $perms);
    }

    /**
     * @param list<string> $effectivePermissions
     *
     * @return list<string>
     */
    private function intersectApiServerPermissions(Request $request, array $effectivePermissions): array
    {
        $apiClient = $request->attributes->get('api_client');
        if (!is_array($apiClient) || !array_key_exists('permissions', $apiClient) || $apiClient['permissions'] === null) {
            return $effectivePermissions;
        }
        $all = $request->attributes->get('api_client_permissions');
        if (!is_array($all)) {
            $all = json_decode((string) $apiClient['permissions'], true);
        }
        $scoped = is_array($all) && is_array($all['server'] ?? null) ? $all['server'] : [];
        if (in_array('*', $scoped, true)) {
            return $effectivePermissions;
        }

        $allowed = [];
        foreach ($scoped as $permission) {
            if (!is_string($permission) || (!str_starts_with($permission, 'files.') && !str_starts_with($permission, 'control.'))) {
                continue;
            }
            $allowed[] = $permission;
            if (str_starts_with($permission, 'files.')) {
                $allowed[] = 'file.' . substr($permission, 6);
            }
        }
        if (array_filter($allowed, static fn (string $permission): bool => str_starts_with($permission, 'control.')) !== []) {
            $allowed[] = 'websocket.connect';
        }

        return array_values(array_intersect($effectivePermissions, array_unique($allowed)));
    }

    /**
     * @param array<string, mixed> $server
     *
     * @return list<string>
     */
    private function spellDenylist(array $server): array
    {
        $spellId = (int) ($server['spell_id'] ?? 0);
        if ($spellId <= 0) {
            return [];
        }
        $spell = Spell::getSpellById($spellId);
        if (!$spell || empty($spell['file_denylist'])) {
            return [];
        }
        $denylist = $spell['file_denylist'];
        if (is_string($denylist)) {
            $decoded = json_decode($denylist, true);
            $denylist = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($denylist)) {
            return [];
        }
        $out = [];
        foreach ($denylist as $entry) {
            if (is_string($entry) && $entry !== '') {
                $out[] = $entry;
            }
        }

        return $out;
    }

    private function joinFilePath(string $root, string $path): string
    {
        if (str_starts_with($path, '/')) {
            return '/' . ltrim($path, '/');
        }

        return rtrim('/' . trim($root, '/'), '/') . '/' . ltrim($path, '/');
    }

    /**
     * Panel-mediated recursive copy for FeatherWings and mixed daemon pairs.
     *
     * @param array<string, mixed> $sourceNode
     * @param array<string, mixed> $sourceServer
     * @param array<string, mixed> $destinationNode
     * @param array<string, mixed> $destinationServer
     * @param array<int, array{from:string,to:string}> $files
     */
    private function copyRemoteThroughPanel(
        array $sourceNode,
        array $sourceServer,
        array $destinationNode,
        array $destinationServer,
        string $sourceRoot,
        string $destinationRoot,
        array $files,
    ): void {
        $sourceService = Wings::fromNode($sourceNode, 900)->getServer();
        $destinationService = Wings::fromNode($destinationNode, 900)->getServer();

        foreach ($files as $file) {
            $source = $this->joinFilePath($sourceRoot, $file['from']);
            $destination = $this->joinFilePath($destinationRoot, $file['to']);
            $this->copyRemoteEntryThroughPanel(
                $sourceService,
                (string) $sourceServer['uuid'],
                $source,
                $destinationService,
                (string) $destinationServer['uuid'],
                $destination
            );
        }
    }

    private function copyRemoteEntryThroughPanel(
        object $sourceService,
        string $sourceServerUuid,
        string $sourcePath,
        object $destinationService,
        string $destinationServerUuid,
        string $destinationPath,
    ): void {
        $parent = dirname($sourcePath);
        $entries = $this->listRemoteDirectoryEntries($sourceService, $sourceServerUuid, $parent);
        $entry = null;
        foreach ($entries as $candidate) {
            if (is_array($candidate) && (string) ($candidate['name'] ?? '') === basename($sourcePath)) {
                $entry = $candidate;
                break;
            }
        }
        if ($entry === null) {
            throw new \RuntimeException('Source path not found: ' . $sourcePath);
        }

        $isDirectory = (bool) ($entry['directory'] ?? !($entry['file'] ?? true));
        if ($isDirectory) {
            $this->createRemoteDirectory($destinationService, $destinationServerUuid, $destinationPath);
            foreach ($this->listRemoteDirectoryEntries($sourceService, $sourceServerUuid, $sourcePath) as $child) {
                if (!is_array($child) || !is_string($child['name'] ?? null) || $child['name'] === '') {
                    continue;
                }
                $this->copyRemoteEntryThroughPanel(
                    $sourceService,
                    $sourceServerUuid,
                    $this->joinFilePath($sourcePath, $child['name']),
                    $destinationService,
                    $destinationServerUuid,
                    $this->joinFilePath($destinationPath, $child['name'])
                );
            }

            return;
        }

        $size = (int) ($entry['size'] ?? 0);
        if ($size > 50 * 1024 * 1024) {
            throw new \RuntimeException('Panel-mediated copy is limited to 50 MiB per file: ' . $sourcePath);
        }
        $this->createRemoteDirectory($destinationService, $destinationServerUuid, dirname($destinationPath));
        $read = $sourceService->getFileContentsRaw($sourceServerUuid, $sourcePath, false);
        if (!$read->isSuccessful()) {
            throw new \RuntimeException('Failed to read ' . $sourcePath . ': ' . $read->getError());
        }
        $write = $destinationService->writeFile($destinationServerUuid, $destinationPath, $read->getRawBody());
        if (!$write->isSuccessful()) {
            throw new \RuntimeException('Failed to write ' . $destinationPath . ': ' . $write->getError());
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function listRemoteDirectoryEntries(object $service, string $serverUuid, string $directory): array
    {
        $page = 1;
        $entries = [];
        do {
            $response = $service->listDirectory($serverUuid, $directory, false, [
                'page' => $page,
                'per_page' => 250,
                'sort' => 'name_asc',
            ]);
            if (!$response->isSuccessful()) {
                throw new \RuntimeException('Failed to list ' . $directory . ': ' . $response->getError());
            }
            $payload = $response->getData();
            $batch = is_array($payload) && is_array($payload['entries'] ?? null)
                ? array_values($payload['entries'])
                : (is_array($payload) && array_is_list($payload) ? $payload : []);
            $entries = array_merge($entries, $batch);
            $total = is_array($payload) ? (int) ($payload['total'] ?? count($entries)) : count($entries);
            ++$page;
        } while ($batch !== [] && count($entries) < $total);

        return $entries;
    }

    private function createRemoteDirectory(object $service, string $serverUuid, string $path): void
    {
        $path = '/' . trim($path, '/');
        if ($path === '/') {
            return;
        }
        // Creating an existing directory is harmless; a later read/write still surfaces real failures.
        $service->createDirectory($serverUuid, basename($path), dirname($path));
    }

    private function isSafeRelativePath(string $path): bool
    {
        if (str_starts_with($path, '/')) {
            return false;
        }
        foreach (explode('/', str_replace('\\', '/', $path)) as $segment) {
            if ($segment === '..') {
                return false;
            }
        }

        return true;
    }

    private function requireApiScope(Request $request, string $bucket, string $permission): ?Response
    {
        $apiClient = $request->attributes->get('api_client');
        if (!is_array($apiClient) || !array_key_exists('permissions', $apiClient) || $apiClient['permissions'] === null) {
            return null;
        }

        $permissions = $request->attributes->get('api_client_permissions');
        if (!is_array($permissions)) {
            $decoded = json_decode((string) $apiClient['permissions'], true);
            $permissions = is_array($decoded) ? $decoded : [];
        }
        $bucketPermissions = $permissions[$bucket] ?? [];
        if (!is_array($bucketPermissions)) {
            $bucketPermissions = [];
        }
        if (in_array('*', $bucketPermissions, true) || in_array($permission, $bucketPermissions, true)) {
            return null;
        }

        return $this->error('Missing API key permission: ' . $bucket . '.' . $permission, 403);
    }

    /**
     * @param list<string> $permissions
     */
    private function requireAnyApiScope(Request $request, string $bucket, array $permissions): ?Response
    {
        foreach ($permissions as $permission) {
            if ($this->requireApiScope($request, $bucket, $permission) === null) {
                return null;
            }
        }

        return $this->error('Missing API key permission: ' . $bucket . '.' . implode(' or ', $permissions), 403);
    }

    private function requireServerReadScope(Request $request): ?Response
    {
        if ($this->requireApiScope($request, 'user', 'servers.read') === null) {
            return null;
        }
        if ($this->requireApiScope($request, 'admin', 'servers.read') === null) {
            return null;
        }

        return $this->error('Missing API key permission: servers.read', 403);
    }

    private function validCommandSnippetPayload(mixed $data): bool
    {
        if (
            !is_array($data)
            || !is_string($data['name'] ?? null)
            || trim($data['name']) === ''
            || strlen($data['name']) > 191
            || !is_string($data['command'] ?? null)
            || !is_array($data['eggs'] ?? null)
        ) {
            return false;
        }
        foreach ($data['eggs'] as $egg) {
            if (!is_string($egg) || preg_match('/^[a-f0-9-]{36}$/i', $egg) !== 1) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param array<string, mixed> $snippet
     *
     * @return array<string, mixed>
     */
    private function mapCommandSnippet(array $snippet): array
    {
        $createdAt = (string) ($snippet['created_at'] ?? '');

        return [
            'uuid' => (string) ($snippet['uuid'] ?? ''),
            'name' => (string) ($snippet['name'] ?? ''),
            'eggs' => is_array($snippet['eggs'] ?? null) ? array_values($snippet['eggs']) : [],
            'command' => (string) ($snippet['command'] ?? ''),
            'created' => $createdAt !== '' ? gmdate('c', strtotime($createdAt)) : gmdate('c'),
        ];
    }

    /**
     * @param array<string, mixed> $data
     */
    private function json(array $data, int $status = 200): Response
    {
        return new Response(json_encode($data, JSON_UNESCAPED_SLASHES), $status, [
            'Content-Type' => 'application/json',
        ]);
    }

    private function error(string $message, int $status = 400): Response
    {
        return $this->json(['error' => $message], $status);
    }
}
