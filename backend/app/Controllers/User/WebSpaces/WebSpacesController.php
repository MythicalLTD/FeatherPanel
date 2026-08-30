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

namespace App\Controllers\User\WebSpaces;

use App\Chat\WebNode;
use App\Chat\WebPlate;
use App\Chat\WebSpace;
use App\Helpers\ApiResponse;
use App\Chat\WebSpaceSubuser;
use OpenApi\Attributes as OA;
use App\Helpers\WebSpaceLimits;
use App\Helpers\WebSpaceGateway;
use App\Helpers\WebSpacePresenter;
use App\WebSpaceSubuserPermissions;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\WebSpacePluginEvents;
use App\Helpers\CheckWebSpacePermission;
use App\Plugins\Events\Events\WebSpaceEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Helpers\WebSpaceInfrastructureReadiness;

/**
 * User-facing WebSpace endpoints (owner, admin, or subuser).
 */
class WebSpacesController
{
    #[OA\Get(path: '/api/user/webspaces', summary: 'List accessible WebSpaces', tags: ['User - WebSpaces'])]
    public function index(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $owned = WebSpace::listByOwnerId((int) $user['id']);
        $byId = [];
        foreach ($owned as $space) {
            $byId[(int) $space['id']] = $space;
        }

        $sharedIds = array_values(array_filter(
            WebSpaceSubuser::listWebSpaceIdsByUserId((int) $user['id']),
            static fn (int $id): bool => !isset($byId[$id]),
        ));
        foreach (WebSpace::listByIds($sharedIds) as $space) {
            $byId[(int) $space['id']] = $space;
        }

        return ApiResponse::success([
            'webspaces' => array_values($byId),
        ], 'OK', 200);
    }

    #[OA\Get(path: '/api/user/webspaces/{uuidShort}', summary: 'Get WebSpace', tags: ['User - WebSpaces'])]
    public function show(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $space = WebSpacePresenter::forUser($space, $resolved['user']);

        return ApiResponse::success(['webspace' => $space], 'OK', 200);
    }

    #[OA\Get(path: '/api/user/webspaces/{uuidShort}/infrastructure-readiness', summary: 'Infrastructure readiness for this WebSpace', tags: ['User - WebSpaces'])]
    public function infrastructureReadiness(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort, WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $webNodeId = (int) ($space['web_node_id'] ?? 0);
        $ssl = !empty($space['ssl']);
        $databaseLimit = (int) ($space['database_limit'] ?? 0);
        $mailboxLimit = (int) ($space['mailbox_limit'] ?? 0);
        $domains = $space['domains'] ?? [];
        if (is_string($domains)) {
            $decoded = json_decode($domains, true);
            $domains = is_array($decoded) ? $decoded : [];
        }
        $hasDomains = is_array($domains) && count(array_filter($domains, static fn ($d) => trim((string) $d) !== '')) > 0;

        $payload = WebSpaceInfrastructureReadiness::inspect(
            $webNodeId > 0 ? $webNodeId : null,
            $ssl,
            $databaseLimit,
            $mailboxLimit,
            $hasDomains,
        );

        return ApiResponse::success($payload, 'OK', 200);
    }

    #[OA\Get(path: '/api/user/webspaces/catalog', summary: 'Order catalog (nodes + WebPlates)', tags: ['User - WebSpaces'])]
    public function catalog(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $nodes = [];
        foreach (WebNode::getAllWebNodes() as $node) {
            $nodes[] = WebNode::sanitizeForAdminResponse($node);
        }

        $plates = WebPlate::listAll(1, 200);

        return ApiResponse::success([
            'web_nodes' => $nodes,
            'webplates' => $plates,
        ], 'OK', 200);
    }

    #[OA\Post(path: '/api/user/webspaces/create', summary: 'Create a WebSpace', tags: ['User - WebSpaces'])]
    public function create(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $limit = (int) ($user['webspace_limit'] ?? 0);
        $owned = WebSpace::countByOwnerId((int) $user['id']);
        if (WebSpaceLimits::isLimitReached($limit, $owned)) {
            return ApiResponse::error(
                'WebSpace limit reached for this account',
                'WEBSPACE_LIMIT_REACHED',
                400,
                ['limit' => $limit, 'owned' => $owned],
            );
        }

        $content['owner_id'] = (int) $user['id'];

        $adminRequest = Request::create(
            '/api/admin/webspaces',
            'PUT',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($content),
        );
        $adminRequest->attributes->set('user', $user);

        return (new \App\Controllers\Admin\WebSpacesController())->create($adminRequest);
    }

    public function utilization(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::getWebSpaceUtilization($webNode, (string) $space['uuid']);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon utilization failed',
                'DAEMON_UTILIZATION_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        if (isset($body['bandwidth_used_bytes'])) {
            WebSpace::updateBandwidthUsage(
                (string) $space['uuid'],
                (int) $body['bandwidth_used_bytes'],
            );
        }

        return ApiResponse::success([
            'utilization' => $body,
        ], 'OK', 200);
    }

    public function backupJobStatus(Request $request, string $uuidShort, string $jobId): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::BACKUP_READ);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $resolved['space']['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::getWebSpaceBackupJobStatus($webNode, (string) $resolved['space']['uuid'], $jobId);
        if (!$daemon['ok']) {
            return ApiResponse::error($daemon['error'] ?? 'Job status failed', 'DAEMON_JOB_STATUS_FAILED', 502);
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : ['job' => $daemon['body']];
        $this->persistCompletedBackupJob($resolved['space'], $body);
        $this->importDumpsAfterRestoreJob($resolved['space'], $body);

        return ApiResponse::success($body, 'OK', 200);
    }

    public function update(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $fields = [];
        if (array_key_exists('name', $content)) {
            $fields['name'] = trim((string) $content['name']);
        }
        if (array_key_exists('description', $content)) {
            $fields['description'] = (string) $content['description'];
        }
        if (array_key_exists('domains', $content)) {
            $fields['domains'] = $content['domains'];
        }
        if (array_key_exists('domain_routes', $content) && is_array($content['domain_routes'])) {
            $fields['domain_routes'] = $content['domain_routes'];
        }
        if (array_key_exists('ssl', $content)) {
            $fields['ssl'] = !empty($content['ssl']);
        }
        if (array_key_exists('ssl_mode', $content)) {
            $mode = strtolower(trim((string) $content['ssl_mode']));
            if (in_array($mode, ['acme', 'dns01'], true)) {
                $fields['ssl_mode'] = $mode;
            }
        }
        if (array_key_exists('www_preference', $content)) {
            $pref = strtolower(trim((string) $content['www_preference']));
            if (in_array($pref, ['apex', 'www', 'none'], true)) {
                $routes = $fields['domain_routes'] ?? ($space['domain_routes'] ?? []);
                if (!is_array($routes)) {
                    $routes = [];
                }
                $sslForWww = array_key_exists('ssl', $fields) ? (bool) $fields['ssl'] : !empty($space['ssl']);
                $fields['domain_routes'] = \App\Chat\WebSpaceDomain::applyWwwPreference($routes, $pref, $sslForWww);
                $fields['domains'] = array_column($fields['domain_routes'], 'domain');
            }
        }
        if (array_key_exists('disk', $content)) {
            $user = $resolved['user'];
            $isOwner = (int) ($user['id'] ?? 0) === (int) ($space['owner_id'] ?? 0);
            $isAdmin = !empty($user['uuid']) && (
                \App\Helpers\PermissionHelper::hasPermission((string) $user['uuid'], \App\Permissions::ADMIN_WEBSPACES_EDIT, $user)
                || \App\Helpers\PermissionHelper::hasPermission((string) $user['uuid'], \App\Permissions::ADMIN_WEBSPACES_VIEW, $user)
            );
            if (!$isOwner && !$isAdmin) {
                return ApiResponse::error(
                    'Only the WebSpace owner or an admin can change disk quota',
                    'DISK_PERMISSION_DENIED',
                    403
                );
            }
            $fields['disk'] = (int) $content['disk'];
        }
        if (array_key_exists('document_root', $content)) {
            return ApiResponse::error(
                'Document root is managed by the WebPlate and cannot be changed here',
                'DOCUMENT_ROOT_LOCKED',
                403
            );
        }
        if (array_key_exists('webplate_id', $content)) {
            $fields['webplate_id'] = (int) $content['webplate_id'];
        }
        if (array_key_exists('waf_enabled', $content)) {
            $fields['waf_enabled'] = !empty($content['waf_enabled']) ? 1 : 0;
        }
        if (array_key_exists('waf_deny_ips', $content)) {
            $fields['waf_deny_ips'] = $content['waf_deny_ips'];
        }
        if (array_key_exists('waf_deny_paths', $content)) {
            $fields['waf_deny_paths'] = $content['waf_deny_paths'];
        }

        if ($fields === []) {
            return ApiResponse::error('No updatable fields provided', 'MISSING_FIELDS', 400);
        }

        $previousSpace = $space;
        $uuid = (string) $space['uuid'];
        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        if (isset($fields['webplate_id'])) {
            $newPlate = WebPlate::getById((int) $fields['webplate_id']);
            if (!$newPlate) {
                return ApiResponse::error('WebPlate not found', 'WEBPLATE_NOT_FOUND', 404);
            }
            $currentPlate = WebPlate::getById((int) $space['webplate_id']);
            $currentRuntime = strtolower(trim((string) ($currentPlate['runtime'] ?? 'static')));
            $newRuntime = strtolower(trim((string) ($newPlate['runtime'] ?? 'static')));
            if ($currentRuntime !== $newRuntime) {
                return ApiResponse::error(
                    'WebPlate runtime family must match the current WebSpace (e.g. php → php only)',
                    'RUNTIME_FAMILY_MISMATCH',
                    400,
                );
            }
            $fields['image'] = (string) ($newPlate['docker_image'] ?? '');
        }

        $sslEnabled = array_key_exists('ssl', $fields) ? (bool) $fields['ssl'] : !empty($space['ssl']);
        if ($sslEnabled && !WebSpaceInfrastructureReadiness::hasAcmeContact($space, $webNode)) {
            return ApiResponse::error(
                'The site owner\'s account email is required when SSL is enabled (or set a fallback acmeEmail on the web node)',
                'MISSING_ACME_EMAIL',
                400,
            );
        }

        if (!WebSpace::update($uuid, $fields)) {
            return ApiResponse::error('Failed to update WebSpace', 'UPDATE_FAILED', 500);
        }

        $space = WebSpace::getByUuid($uuid) ?? $space;

        $daemon = \App\Helpers\WebSpaceDaemonSync::syncAfterUpdate($webNode, $space, $previousSpace);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                'WebSpace saved on panel but daemon sync failed: ' . ($daemon['error'] ?? 'unknown'),
                'DAEMON_SYNC_FAILED',
                502,
                [
                    'webspace' => $space,
                    'daemon' => $daemon,
                ],
            );
        }

        \App\Helpers\WebSpaceActivityLogger::log($space, $resolved['user'], 'webspace.settings.updated', [
            'fields' => array_keys($fields),
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceUpdated(), WebSpacePluginEvents::basePayload(
            $resolved['user']['uuid'] ?? null,
            $space,
            [
                'changed_fields' => array_keys($fields),
                'context' => ['source' => 'user'],
            ],
        ));

        return ApiResponse::success([
            'webspace' => $space,
            'daemon' => is_array($daemon['sync']['body'] ?? null) ? $daemon['sync']['body'] : [],
            'runtime_recreated' => isset($daemon['recreate']),
        ], 'WebSpace updated', 200);
    }

    public function phpIni(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $resolved['space']['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $uuid = (string) $resolved['space']['uuid'];
        $read = FeatherQuilldClient::getWebSpaceFileContents($webNode, $uuid, '.featherquilld/php.ini');
        $contents = '';
        if ($read['ok']) {
            $body = $read['body'];
            $contents = is_string($body) ? $body : (is_array($body) ? (string) ($body['data'] ?? $body['contents'] ?? '') : '');
        }
        if ($contents === '') {
            $contents = "; FeatherQuilld per-site php.ini\nmemory_limit = 256M\nupload_max_filesize = 64M\npost_max_size = 64M\nmax_execution_time = 120\n";
        }

        return ApiResponse::success([
            'path' => '.featherquilld/php.ini',
            'contents' => $contents,
        ], 'OK', 200);
    }

    public function savePhpIni(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content) || !array_key_exists('contents', $content)) {
            return ApiResponse::error('contents is required', 'INVALID_JSON', 400);
        }

        $ini = (string) $content['contents'];
        if (strlen($ini) > 256_000) {
            return ApiResponse::error('php.ini is too large', 'PHP_INI_TOO_LARGE', 400);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $uuid = (string) $space['uuid'];
        FeatherQuilldClient::createWebSpaceDirectory($webNode, $uuid, '.featherquilld');
        $write = FeatherQuilldClient::writeWebSpaceFile($webNode, $uuid, '.featherquilld/php.ini', $ini);
        if (!$write['ok']) {
            return ApiResponse::error($write['error'] ?? 'Failed to write php.ini', 'PHP_INI_WRITE_FAILED', 502);
        }

        $runtime = strtolower(trim((string) ($space['webplate_runtime'] ?? '')));
        if ($runtime === '' && !empty($space['webplate_id'])) {
            $plate = WebPlate::getById((int) $space['webplate_id']);
            $runtime = strtolower(trim((string) ($plate['runtime'] ?? '')));
        }

        $recreated = false;
        if ($runtime === 'php') {
            $recreate = FeatherQuilldClient::recreateRuntime($webNode, $uuid);
            if (!$recreate['ok']) {
                return ApiResponse::error(
                    'php.ini saved but runtime recreate failed: ' . ($recreate['error'] ?? 'unknown'),
                    'DAEMON_RECREATE_FAILED',
                    502,
                );
            }
            $recreated = true;
        }

        \App\Helpers\WebSpaceActivityLogger::log($space, $resolved['user'], 'webspace.php_ini.updated', []);

        return ApiResponse::success([
            'path' => '.featherquilld/php.ini',
            'runtime_recreated' => $recreated,
        ], 'php.ini saved', 200);
    }

    public function phpExtensions(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $resolved['space']['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $uuid = (string) $resolved['space']['uuid'];
        $read = FeatherQuilldClient::getWebSpaceFileContents($webNode, $uuid, '.featherquilld/php-extensions.json');
        $extensions = [];
        if ($read['ok']) {
            $body = $read['body'];
            $raw = is_string($body) ? $body : (is_array($body) ? (string) ($body['data'] ?? $body['contents'] ?? '') : '');
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                if (isset($decoded['extensions']) && is_array($decoded['extensions'])) {
                    $extensions = $decoded['extensions'];
                } elseif (array_is_list($decoded)) {
                    $extensions = $decoded;
                }
            }
        }

        $catalog = [
            'bcmath', 'calendar', 'exif', 'gd', 'gettext', 'gmp', 'intl', 'ldap',
            'pdo_pgsql', 'pgsql', 'redis', 'soap', 'sockets', 'zip',
        ];
        $selected = [];
        foreach ($extensions as $ext) {
            $name = strtolower(trim((string) $ext));
            if ($name !== '' && in_array($name, $catalog, true) && !in_array($name, $selected, true)) {
                $selected[] = $name;
            }
        }
        sort($selected);

        return ApiResponse::success([
            'path' => '.featherquilld/php-extensions.json',
            'catalog' => $catalog,
            'baseline' => ['mysqli', 'pdo_mysql', 'opcache'],
            'extensions' => $selected,
        ], 'OK', 200);
    }

    public function savePhpExtensions(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content) || !array_key_exists('extensions', $content) || !is_array($content['extensions'])) {
            return ApiResponse::error('extensions array is required', 'INVALID_JSON', 400);
        }

        $catalog = [
            'bcmath', 'calendar', 'exif', 'gd', 'gettext', 'gmp', 'intl', 'ldap',
            'pdo_pgsql', 'pgsql', 'redis', 'soap', 'sockets', 'zip',
        ];
        $selected = [];
        foreach ($content['extensions'] as $ext) {
            $name = strtolower(trim((string) $ext));
            if ($name !== '' && in_array($name, $catalog, true) && !in_array($name, $selected, true)) {
                $selected[] = $name;
            }
        }
        sort($selected);

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $uuid = (string) $space['uuid'];
        $json = json_encode(['extensions' => $selected], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
        FeatherQuilldClient::createWebSpaceDirectory($webNode, $uuid, '.featherquilld');
        $write = FeatherQuilldClient::writeWebSpaceFile($webNode, $uuid, '.featherquilld/php-extensions.json', $json);
        if (!$write['ok']) {
            return ApiResponse::error($write['error'] ?? 'Failed to write php-extensions.json', 'PHP_EXTENSIONS_WRITE_FAILED', 502);
        }

        $runtime = strtolower(trim((string) ($space['webplate_runtime'] ?? '')));
        if ($runtime === '' && !empty($space['webplate_id'])) {
            $plate = WebPlate::getById((int) $space['webplate_id']);
            $runtime = strtolower(trim((string) ($plate['runtime'] ?? '')));
        }

        $recreated = false;
        if ($runtime === 'php') {
            $recreate = FeatherQuilldClient::recreateRuntime($webNode, $uuid);
            if (!$recreate['ok']) {
                return ApiResponse::error(
                    'Extensions saved but runtime recreate failed: ' . ($recreate['error'] ?? 'unknown'),
                    'DAEMON_RECREATE_FAILED',
                    502,
                );
            }
            $recreated = true;
        }

        \App\Helpers\WebSpaceActivityLogger::log($space, $resolved['user'], 'webspace.php_extensions.updated', [
            'extensions' => $selected,
        ]);

        return ApiResponse::success([
            'path' => '.featherquilld/php-extensions.json',
            'extensions' => $selected,
            'runtime_recreated' => $recreated,
        ], 'PHP extensions saved', 200);
    }

    public function redis(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $resolved['space']['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $uuid = (string) $resolved['space']['uuid'];
        $read = FeatherQuilldClient::getWebSpaceFileContents($webNode, $uuid, '.featherquilld/redis.json');
        $enabled = false;
        $host = 'redis';
        $port = 6379;
        $password = '';
        if ($read['ok']) {
            $body = $read['body'];
            $raw = is_string($body) ? $body : (is_array($body) ? (string) ($body['data'] ?? $body['contents'] ?? '') : '');
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $enabled = !empty($decoded['enabled']);
                $host = trim((string) ($decoded['host'] ?? 'redis')) ?: 'redis';
                $port = (int) ($decoded['port'] ?? 6379) ?: 6379;
                $password = (string) ($decoded['password'] ?? '');
            }
        }

        return ApiResponse::success([
            'enabled' => $enabled,
            'host' => $host,
            'port' => $port,
            'password' => $password,
            'env' => [
                'REDIS_HOST' => $host,
                'REDIS_PORT' => $port,
                'REDIS_PASSWORD' => $password,
            ],
        ], 'OK', 200);
    }

    public function saveRedis(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content) || !array_key_exists('enabled', $content)) {
            return ApiResponse::error('enabled is required', 'INVALID_JSON', 400);
        }

        $enabled = !empty($content['enabled']);
        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $uuid = (string) $space['uuid'];
        $password = '';
        if ($enabled) {
            $existing = FeatherQuilldClient::getWebSpaceFileContents($webNode, $uuid, '.featherquilld/redis.json');
            if ($existing['ok']) {
                $body = $existing['body'];
                $raw = is_string($body) ? $body : (is_array($body) ? (string) ($body['data'] ?? $body['contents'] ?? '') : '');
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $password = (string) ($decoded['password'] ?? '');
                }
            }
            if ($password === '') {
                $password = bin2hex(random_bytes(16));
            }
        }

        $payload = [
            'enabled' => $enabled,
            'host' => 'redis',
            'port' => 6379,
            'password' => $password,
        ];
        $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
        FeatherQuilldClient::createWebSpaceDirectory($webNode, $uuid, '.featherquilld');
        $write = FeatherQuilldClient::writeWebSpaceFile($webNode, $uuid, '.featherquilld/redis.json', $json);
        if (!$write['ok']) {
            return ApiResponse::error($write['error'] ?? 'Failed to write redis.json', 'REDIS_WRITE_FAILED', 502);
        }

        if ($enabled) {
            $extRead = FeatherQuilldClient::getWebSpaceFileContents($webNode, $uuid, '.featherquilld/php-extensions.json');
            $extensions = [];
            if ($extRead['ok']) {
                $body = $extRead['body'];
                $raw = is_string($body) ? $body : (is_array($body) ? (string) ($body['data'] ?? $body['contents'] ?? '') : '');
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $extensions = isset($decoded['extensions']) && is_array($decoded['extensions'])
                        ? $decoded['extensions']
                        : (array_is_list($decoded) ? $decoded : []);
                }
            }
            $extensions = array_values(array_unique(array_map('strval', $extensions)));
            if (!in_array('redis', $extensions, true)) {
                $extensions[] = 'redis';
                sort($extensions);
                FeatherQuilldClient::writeWebSpaceFile(
                    $webNode,
                    $uuid,
                    '.featherquilld/php-extensions.json',
                    json_encode(['extensions' => $extensions], JSON_PRETTY_PRINT) . "\n",
                );
            }
        }

        $recreated = false;
        $runtime = strtolower(trim((string) ($space['webplate_runtime'] ?? '')));
        if ($runtime === '' && !empty($space['webplate_id'])) {
            $plate = WebPlate::getById((int) $space['webplate_id']);
            $runtime = strtolower(trim((string) ($plate['runtime'] ?? '')));
        }
        if ($runtime === 'php') {
            $recreate = FeatherQuilldClient::recreateRuntime($webNode, $uuid);
            if (!$recreate['ok']) {
                return ApiResponse::error(
                    'Redis config saved but runtime recreate failed: ' . ($recreate['error'] ?? 'unknown'),
                    'DAEMON_RECREATE_FAILED',
                    502,
                );
            }
            $recreated = true;
        }

        \App\Helpers\WebSpaceActivityLogger::log($space, $resolved['user'], 'webspace.redis.updated', [
            'enabled' => $enabled,
        ]);

        return ApiResponse::success([
            'enabled' => $enabled,
            'host' => 'redis',
            'port' => 6379,
            'password' => $password,
            'runtime_recreated' => $recreated,
        ], 'Redis add-on updated', 200);
    }

    public function malwareScan(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            $content = [];
        }

        $scan = FeatherQuilldClient::startWebSpaceMalwareScan(
            $webNode,
            (string) $space['uuid'],
            ['async' => array_key_exists('async', $content) ? !empty($content['async']) : true],
        );
        if (!$scan['ok']) {
            $msg = is_array($scan['body']) ? (string) ($scan['body']['error'] ?? $scan['error'] ?? 'Scan failed') : (string) ($scan['error'] ?? 'Scan failed');

            return ApiResponse::error($msg, 'MALWARE_SCAN_FAILED', $scan['status'] >= 400 ? $scan['status'] : 502);
        }

        \App\Helpers\WebSpaceActivityLogger::log($space, $resolved['user'], 'webspace.malware_scan.started', []);

        return ApiResponse::success($scan['body'], 'Malware scan started', $scan['status'] === 202 ? 202 : 200);
    }

    public function malwareScanStatus(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $uuid = (string) $space['uuid'];
        $jobId = trim((string) $request->query->get('job_id', ''));
        if ($jobId !== '') {
            $job = FeatherQuilldClient::getWebSpaceMalwareScanJob($webNode, $uuid, $jobId);
            if (!$job['ok']) {
                return ApiResponse::error($job['error'] ?? 'Job not found', 'MALWARE_JOB_NOT_FOUND', 404);
            }

            return ApiResponse::success($job['body'], 'OK', 200);
        }

        $probe = FeatherQuilldClient::probeWebSpaceMalwareScan($webNode);
        $last = FeatherQuilldClient::getWebSpaceMalwareScanLast($webNode, $uuid);

        return ApiResponse::success([
            'probe' => is_array($probe['body']) ? $probe['body'] : null,
            'last' => is_array($last['body']) ? ($last['body']['last'] ?? null) : null,
        ], 'OK', 200);
    }

    public function enableMalwareScanSchedule(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::SCHEDULE_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        $scheduleId = \App\Chat\WebSpaceSchedule::create([
            'webspace_id' => (int) $space['id'],
            'name' => 'Weekly malware scan',
            'cron_day_of_week' => '0',
            'cron_month' => '*',
            'cron_day_of_month' => '*',
            'cron_hour' => '3',
            'cron_minute' => '30',
            'timezone' => 'UTC',
            'is_active' => 1,
        ]);
        if ($scheduleId === false) {
            return ApiResponse::error('Failed to create malware scan schedule', 'CREATION_FAILED', 500);
        }

        $tasks = [[
            'action' => 'malware_scan',
            'payload' => '',
            'sequence_id' => 1,
            'time_offset' => 0,
            'continue_on_failure' => false,
        ]];
        if (!\App\Chat\WebSpaceSchedule::replaceTasks($scheduleId, $tasks)) {
            \App\Chat\WebSpaceSchedule::delete($scheduleId);

            return ApiResponse::error('Failed to create schedule tasks', 'TASK_CREATION_FAILED', 500);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if ($webNode) {
            FeatherQuilldClient::syncWebSpaceSchedules($webNode, (string) $space['uuid']);
        }

        \App\Helpers\WebSpaceActivityLogger::log($space, $resolved['user'], 'webspace.malware_scan.scheduled', [
            'schedule_id' => $scheduleId,
        ]);

        return ApiResponse::success([
            'schedule_id' => $scheduleId,
            'cron' => '30 3 * * 0',
        ], 'Weekly malware scan scheduled', 200);
    }

    public function power(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $uuid = (string) $space['uuid'];

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $action = strtolower(trim((string) ($content['action'] ?? '')));
        if (!in_array($action, ['start', 'stop', 'restart', 'kill'], true)) {
            return ApiResponse::error('action must be start, stop, restart, or kill', 'INVALID_ACTION', 400);
        }

        if (!WebSpaceGateway::canControl((string) $resolved['user']['uuid'], $space, $action)) {
            if (WebSpaceGateway::isSuspended($space)) {
                return ApiResponse::error('WebSpace is suspended', 'WEBSPACE_SUSPENDED', 403);
            }

            return ApiResponse::error(
                'You do not have permission to perform this action',
                'PERMISSION_DENIED',
                403
            );
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::powerWebSpace($webNode, $uuid, $action);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon power action failed',
                'DAEMON_POWER_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        if (isset($body['state'])) {
            WebSpace::updateRuntimeState(
                $uuid,
                (string) $body['state'],
                isset($body['backend_port']) ? (int) $body['backend_port'] : null,
            );
        }

        $space = WebSpace::getByUuid($uuid) ?? $space;
        \App\Helpers\WebSpaceActivityLogger::log($space, $resolved['user'], 'webspace.power.' . $action, []);

        return ApiResponse::success([
            'webspace' => $space,
            'daemon' => $body,
        ], 'OK', 200);
    }

    public function status(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $uuid = (string) $space['uuid'];
        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::getWebSpaceStatus($webNode, $uuid);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon status failed',
                'DAEMON_STATUS_FAILED',
                502,
                [
                    'webspace' => $space,
                    'daemon' => $daemon,
                ],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        if (isset($body['state'])) {
            WebSpace::updateRuntimeState(
                $uuid,
                (string) $body['state'],
                isset($body['backend_port']) ? (int) $body['backend_port'] : null,
            );
            $space = WebSpace::getByUuid($uuid) ?? $space;
        }

        return ApiResponse::success([
            'webspace' => $space,
            'status' => $body,
        ], 'OK', 200);
    }

    public function logs(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $lines = max(1, min(5000, (int) $request->query->get('lines', 100)));
        $daemon = FeatherQuilldClient::getWebSpaceLogs($webNode, (string) $space['uuid'], $lines);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon logs failed',
                'DAEMON_LOGS_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : ['data' => (string) $daemon['body']];

        return ApiResponse::success($body, 'OK', 200);
    }

    public function installLogs(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::getWebSpaceInstallLogs($webNode, (string) $space['uuid']);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon install logs failed',
                'DAEMON_INSTALL_LOGS_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : ['data' => (string) $daemon['body']];

        return ApiResponse::success($body, 'OK', 200);
    }

    public function reinstall(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $uuid = (string) $space['uuid'];

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            $content = [];
        }

        $wipeFiles = array_key_exists('wipe_files', $content) ? (bool) $content['wipe_files'] : true;
        $startOnCompletion = !empty($content['start_on_completion']);

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        WebSpace::updateStatus($uuid, 'reinstalling');

        $daemon = FeatherQuilldClient::reinstallWebSpace($webNode, $uuid, $wipeFiles, $startOnCompletion);
        if (!$daemon['ok']) {
            WebSpace::updateStatus($uuid, 'reinstall_failed');

            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon reinstall failed',
                'DAEMON_REINSTALL_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        if (isset($body['state'])) {
            WebSpace::updateRuntimeState(
                $uuid,
                (string) $body['state'],
                isset($body['backend_port']) ? (int) $body['backend_port'] : null,
            );
        }
        if (isset($body['status'])) {
            WebSpace::updateStatus($uuid, (string) $body['status']);
        } else {
            WebSpace::updateStatus($uuid, 'installed');
        }

        $space = WebSpace::getByUuid($uuid) ?? $space;

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceReinstalled(), WebSpacePluginEvents::basePayload(
            $resolved['user']['uuid'] ?? null,
            $space,
            ['context' => ['source' => 'user', 'wipe_files' => $wipeFiles]],
        ));

        return ApiResponse::success([
            'webspace' => $space,
            'daemon' => $body,
        ], 'OK', 200);
    }

    public function ssl(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::getWebSpaceSsl($webNode, (string) $space['uuid']);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon SSL status failed',
                'DAEMON_SSL_FAILED',
                502,
                [
                    'webspace' => $space,
                    'daemon' => $daemon,
                ],
            );
        }

        return ApiResponse::success([
            'webspace' => $space,
            'ssl' => is_array($daemon['body']) ? $daemon['body'] : $daemon['body'],
        ], 'OK', 200);
    }

    public function renewSsl(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        return (new \App\Controllers\Admin\WebSpacesController())->renewSsl($request, (string) $resolved['space']['uuid']);
    }

    public function checkDns(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        // Reuse admin DNS logic via full UUID path on the same model.
        return (new \App\Controllers\Admin\WebSpacesController())->checkDns($request, (string) $resolved['space']['uuid']);
    }

    public function provisionDns(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        return (new \App\Controllers\Admin\WebSpacesController())->provisionDns($request, (string) $resolved['space']['uuid']);
    }

    public function uploadCustomSsl(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        return (new \App\Controllers\Admin\WebSpacesController())->uploadCustomSsl($request, (string) $resolved['space']['uuid']);
    }

    public function customSslStatus(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($denied instanceof Response) {
            return $denied;
        }

        return (new \App\Controllers\Admin\WebSpacesController())->customSslStatus($request, (string) $resolved['space']['uuid']);
    }

    public function deleteCustomSsl(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        return (new \App\Controllers\Admin\WebSpacesController())->deleteCustomSsl($request, (string) $resolved['space']['uuid']);
    }

    public function listBackups(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::BACKUP_READ);
        if ($denied instanceof Response) {
            return $denied;
        }

        return (new \App\Controllers\Admin\WebSpacesController())->listBackups($request, (string) $resolved['space']['uuid']);
    }

    public function createBackup(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::BACKUP_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        return (new \App\Controllers\Admin\WebSpacesController())->createBackup($request, (string) $resolved['space']['uuid']);
    }

    public function deleteBackup(Request $request, string $uuidShort, string $backupUuid): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::BACKUP_DELETE);
        if ($denied instanceof Response) {
            return $denied;
        }

        return (new \App\Controllers\Admin\WebSpacesController())->deleteBackup($request, (string) $resolved['space']['uuid'], $backupUuid);
    }

    public function restoreBackup(Request $request, string $uuidShort, string $backupUuid): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::BACKUP_RESTORE);
        if ($denied instanceof Response) {
            return $denied;
        }

        return (new \App\Controllers\Admin\WebSpacesController())->restoreBackup($request, (string) $resolved['space']['uuid'], $backupUuid);
    }

    public function listBackupFiles(Request $request, string $uuidShort, string $backupUuid): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::BACKUP_RESTORE);
        if ($denied instanceof Response) {
            return $denied;
        }

        return (new \App\Controllers\Admin\WebSpacesController())->listBackupFiles($request, (string) $resolved['space']['uuid'], $backupUuid);
    }

    public function downloadBackup(Request $request, string $uuidShort, string $backupUuid): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::BACKUP_DOWNLOAD);
        if ($denied instanceof Response) {
            return $denied;
        }

        return (new \App\Controllers\Admin\WebSpacesController())->downloadBackup($request, (string) $resolved['space']['uuid'], $backupUuid);
    }

    public function importBackup(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $denied = CheckWebSpacePermission::require($request, $resolved['space'], WebSpaceSubuserPermissions::BACKUP_CREATE);
        if ($denied instanceof Response) {
            return $denied;
        }

        return (new \App\Controllers\Admin\WebSpacesController())->importBackup($request, (string) $resolved['space']['uuid']);
    }

    public function transferStatus(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $uuid = (string) $resolved['space']['uuid'];
        $active = \App\Chat\WebSpaceTransfer::getActiveByUuid($uuid);
        if ($active) {
            $sourceNode = WebNode::getWebNodeById((int) $active['source_web_node_id']);
            if ($sourceNode) {
                $daemon = FeatherQuilldClient::getTransferStatus($sourceNode, $uuid);
                if ($daemon['ok'] && is_array($daemon['body'])) {
                    return ApiResponse::success([
                        'transfer_id' => (int) $active['id'],
                        'panel_status' => $active['status'],
                        'daemon' => $daemon['body'],
                    ], 'OK', 200);
                }
            }

            return ApiResponse::success([
                'transfer_id' => (int) $active['id'],
                'panel_status' => $active['status'],
                'daemon' => [
                    'uuid' => $uuid,
                    'phase' => 'running',
                    'message' => 'Transfer in progress…',
                ],
            ], 'OK', 200);
        }

        $latest = \App\Chat\WebSpaceTransfer::getLatestByUuid($uuid);
        if ($latest) {
            return ApiResponse::success([
                'transfer_id' => (int) $latest['id'],
                'panel_status' => $latest['status'],
                'daemon' => [
                    'uuid' => $uuid,
                    'phase' => ($latest['status'] ?? '') === 'completed' ? 'completed' : 'failed',
                    'message' => $latest['error'] ?? null,
                ],
            ], 'OK', 200);
        }

        $space = $resolved['space'];
        if (($space['status'] ?? '') === 'transferring') {
            return ApiResponse::success([
                'panel_status' => 'transferring',
                'daemon' => [
                    'uuid' => $uuid,
                    'phase' => 'running',
                    'message' => 'Transfer in progress…',
                ],
            ], 'OK', 200);
        }

        return ApiResponse::error('No transfer found for this WebSpace', 'TRANSFER_NOT_FOUND', 404);
    }

    public function generateJwt(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveAccessible($request, $uuidShort);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $uuid = (string) $space['uuid'];

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $tokenId = trim((string) ($webNode['daemon_token_id'] ?? ''));
        $token = trim((string) ($webNode['daemon_token'] ?? ''));
        if ($tokenId === '' || $token === '') {
            return ApiResponse::error('Web node is missing daemon credentials', 'MISSING_DAEMON_TOKEN', 500);
        }

        $fqdn = trim((string) ($webNode['fqdn'] ?? ''));
        if ($fqdn === '') {
            return ApiResponse::error('Web node is missing fqdn', 'MISSING_FQDN', 500);
        }

        try {
            $jwt = \App\Services\Quilld\QuilldConsoleJwt::create(
                $uuid,
                $tokenId,
                $token,
                \App\Services\Quilld\QuilldConsoleJwt::DEFAULT_TTL_SECONDS,
                self::consolePermissionsFor($resolved['user'], $space),
                (string) ($resolved['user']['uuid'] ?? ''),
            );
            $socket = \App\Services\Quilld\QuilldConsoleJwt::buildSocketUrl($webNode, $uuid);

            return ApiResponse::success([
                'token' => $jwt,
                'socket' => $socket,
                'connection_string' => $socket,
            ], 'OK', 200);
        } catch (\Throwable $e) {
            return ApiResponse::error(
                'Failed to generate JWT: ' . $e->getMessage(),
                'JWT_GENERATION_FAILED',
                500,
            );
        }
    }

    /**
     * When an async create job finishes, upsert the panel WebSpaceBackup row.
     *
     * @param array<string, mixed> $space
     * @param array<string, mixed> $body
     */
    private function persistCompletedBackupJob(array $space, array $body): void
    {
        $fields = WebSpaceLimits::backupJobFields($body);
        if ($fields === null) {
            return;
        }

        $backupUuid = $fields['uuid'];
        $bytes = $fields['bytes'];
        $checksum = $fields['checksum'];

        $existing = \App\Chat\WebSpaceBackup::getByUuid($backupUuid);
        if ($existing) {
            \App\Chat\WebSpaceBackup::markCompleted($backupUuid, $bytes, $checksum);

            return;
        }

        \App\Chat\WebSpaceBackup::create([
            'uuid' => $backupUuid,
            'webspace_id' => (int) $space['id'],
            'bytes' => $bytes,
            'checksum' => $checksum,
            'status' => 'completed',
        ]);
        \App\Chat\WebSpaceBackup::markCompleted($backupUuid, $bytes, $checksum);
    }

    /**
     * @param array<string, mixed> $space
     * @param array<string, mixed> $body
     */
    private function importDumpsAfterRestoreJob(array $space, array $body): void
    {
        $job = is_array($body['job'] ?? null) ? $body['job'] : $body;
        $phase = strtolower((string) ($job['phase'] ?? ''));
        $operation = strtolower((string) ($job['operation'] ?? ''));
        if ($phase !== 'completed' || $operation !== 'restore') {
            return;
        }

        try {
            \App\Helpers\WebSpaceDatabaseDumpService::importDumpsFromWebSpace($space);
        } catch (\Throwable) {
            // Restore files already succeeded; dump import is best-effort.
        }
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $space
     *
     * @return list<string>
     */
    private static function consolePermissionsFor(array $user, array $space): array
    {
        $userUuid = (string) ($user['uuid'] ?? '');
        $userId = (int) ($user['id'] ?? 0);
        if ($userId > 0 && isset($space['owner_id']) && (int) $space['owner_id'] === $userId) {
            return ['*'];
        }

        $perms = [];
        if ($userUuid !== '' && WebSpaceGateway::hasPermission($userUuid, $space, WebSpaceSubuserPermissions::CONSOLE_OUTPUT)) {
            $perms[] = WebSpaceSubuserPermissions::CONSOLE_OUTPUT;
        }
        if ($userUuid !== '' && WebSpaceGateway::hasPermission($userUuid, $space, WebSpaceSubuserPermissions::CONSOLE_SEND)) {
            $perms[] = WebSpaceSubuserPermissions::CONSOLE_SEND;
        }

        return $perms === [] ? [WebSpaceSubuserPermissions::CONSOLE_OUTPUT] : $perms;
    }

    /**
     * @return array{user: array<string, mixed>, space: array<string, mixed>}|Response
     */
    private function resolveAccessible(Request $request, string $uuidShort): array | Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        if (!WebSpaceGateway::canUserAccessWebSpace((string) $user['uuid'], (string) $space['uuid'])) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        return ['user' => $user, 'space' => $space];
    }
}
