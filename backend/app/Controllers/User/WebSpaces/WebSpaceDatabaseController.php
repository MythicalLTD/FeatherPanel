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

use App\Helpers\ApiResponse;
use App\Chat\DatabaseInstance;
use App\Chat\WebSpaceDatabase;
use App\Helpers\WebSpaceGateway;
use App\WebSpaceSubuserPermissions;
use App\Helpers\WebSpacePluginEvents;
use App\Helpers\WebSpaceActivityLogger;
use App\Helpers\CheckWebSpacePermission;
use App\Helpers\RemoteDatabaseProvisioner;
use App\Plugins\Events\Events\WebSpaceEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WebSpaceDatabaseController
{
    public function index(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DATABASE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $databases = WebSpaceDatabase::listByWebSpaceId((int) $resolved['space']['id']);
        foreach ($databases as &$row) {
            $host = DatabaseInstance::getDatabaseById((int) ($row['database_host_id'] ?? 0));
            if ($host) {
                $row['database_host'] = DatabaseInstance::getDatabaseHostname($host);
            }
            if (!$this->canViewPassword($resolved)) {
                $row['password'] = '[REDACTED]';
            }
        }
        unset($row);

        return ApiResponse::success(['data' => $databases], 'OK', 200);
    }

    public function hosts(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DATABASE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $webNodeId = (int) ($resolved['space']['web_node_id'] ?? 0);
        $hosts = DatabaseInstance::getDatabasesForWebNode($webNodeId);
        $sanitized = array_map(static function (array $host): array {
            unset($host['database_password']);

            return $host;
        }, $hosts);

        return ApiResponse::success(['hosts' => $sanitized], 'OK', 200);
    }

    public function create(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DATABASE_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $spaceId = (int) $space['id'];
        $limit = (int) ($space['database_limit'] ?? 1);
        if (\App\Helpers\WebSpaceLimits::isLimitReached($limit, WebSpaceDatabase::countByWebSpaceId($spaceId))) {
            return ApiResponse::error('Database limit reached', 'DATABASE_LIMIT_REACHED', 400);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $hostId = (int) ($body['database_host_id'] ?? 0);
        $namePart = trim((string) ($body['database_name'] ?? ''));
        if ($hostId <= 0 || $namePart === '') {
            return ApiResponse::error('database_host_id and database_name are required', 'VALIDATION_FAILED', 400);
        }

        if (!preg_match('/^[a-zA-Z0-9_]{1,48}$/', $namePart)) {
            return ApiResponse::error('database_name must be alphanumeric/underscore', 'VALIDATION_FAILED', 400);
        }

        $databaseHost = DatabaseInstance::getDatabaseById($hostId);
        if (!$databaseHost) {
            return ApiResponse::error('Database host not found', 'DATABASE_HOST_NOT_FOUND', 404);
        }

        if (!$this->hostAllowedForWebNode($databaseHost, (int) $space['web_node_id'])) {
            return ApiResponse::error('Database host is not available for this WebSpace node', 'DATABASE_HOST_NODE_MISMATCH', 400);
        }

        if (!in_array($databaseHost['database_type'], ['mysql', 'mariadb', 'postgresql'], true)) {
            return ApiResponse::error('Unsupported database type', 'UNSUPPORTED_DATABASE_TYPE', 400);
        }

        $databaseName = 'w' . $spaceId . '_' . $namePart;
        $username = 'u' . $spaceId . '_' . RemoteDatabaseProvisioner::generateRandomString(10);
        $password = RemoteDatabaseProvisioner::generateRandomString(16);
        $remote = (string) ($body['remote'] ?? '%');
        $maxConnections = max(0, (int) ($body['max_connections'] ?? 0));

        try {
            RemoteDatabaseProvisioner::create(
                $databaseHost,
                $databaseName,
                $username,
                $password,
                $remote,
                $maxConnections,
            );
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to create database on host: ' . $e->getMessage(), 'CREATION_FAILED', 500);
        }

        $recordId = WebSpaceDatabase::create([
            'webspace_id' => $spaceId,
            'database_host_id' => $hostId,
            'database' => $databaseName,
            'username' => $username,
            'password' => $password,
            'remote' => $remote,
            'max_connections' => $maxConnections,
        ]);

        if (!$recordId) {
            try {
                RemoteDatabaseProvisioner::delete($databaseHost, $databaseName, $username, $remote);
            } catch (\Throwable) {
            }

            return ApiResponse::error('Failed to save database record', 'CREATION_FAILED', 500);
        }

        WebSpaceActivityLogger::log($space, $resolved['user'], 'webspace.database.created', [
            'database_id' => $recordId,
            'database_name' => $databaseName,
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceDatabaseCreated(), WebSpacePluginEvents::basePayload(
            $resolved['user']['uuid'] ?? null,
            $space,
            [
                'database_id' => (int) $recordId,
                'context' => ['source' => 'user'],
            ],
        ));

        return ApiResponse::success([
            'id' => $recordId,
            'database_name' => $databaseName,
            'username' => $username,
            'password' => $password,
        ], 'Database created', 201);
    }

    public function delete(Request $request, string $uuidShort, int $databaseId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DATABASE_DELETE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $record = WebSpaceDatabase::getById($databaseId);
        if (!$record || (int) $record['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Database not found', 'NOT_FOUND', 404);
        }

        $databaseHost = DatabaseInstance::getDatabaseById((int) $record['database_host_id']);
        if ($databaseHost) {
            try {
                RemoteDatabaseProvisioner::delete(
                    $databaseHost,
                    (string) $record['database'],
                    (string) $record['username'],
                    (string) ($record['remote'] ?? '%'),
                );
            } catch (\Throwable $e) {
                return ApiResponse::error('Failed to delete database on host: ' . $e->getMessage(), 'DELETE_FAILED', 500);
            }
        }

        WebSpaceDatabase::delete($databaseId);
        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.database.deleted', [
            'database_id' => $databaseId,
            'database_name' => $record['database'],
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceDatabaseDeleted(), WebSpacePluginEvents::basePayload(
            $resolved['user']['uuid'] ?? null,
            $resolved['space'],
            [
                'database_id' => $databaseId,
                'context' => ['source' => 'user'],
            ],
        ));

        return ApiResponse::success([], 'Deleted', 200);
    }

    public function resetPassword(Request $request, string $uuidShort, int $databaseId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DATABASE_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $record = WebSpaceDatabase::getById($databaseId);
        if (!$record || (int) $record['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Database not found', 'NOT_FOUND', 404);
        }

        $databaseHost = DatabaseInstance::getDatabaseById((int) $record['database_host_id']);
        if (!$databaseHost) {
            return ApiResponse::error('Database host not found', 'DATABASE_HOST_NOT_FOUND', 404);
        }

        $password = RemoteDatabaseProvisioner::generateRandomString(16);

        try {
            RemoteDatabaseProvisioner::resetPassword(
                $databaseHost,
                (string) $record['username'],
                $password,
                (string) ($record['remote'] ?? '%'),
                (int) ($record['max_connections'] ?? 0),
            );
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to reset password: ' . $e->getMessage(), 'RESET_FAILED', 500);
        }

        WebSpaceDatabase::update($databaseId, ['password' => $password]);
        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.database.password_reset', [
            'database_id' => $databaseId,
        ]);

        return ApiResponse::success(['password' => $password], 'Password reset', 200);
    }

    public function checkPhpMyAdminInstalled(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DATABASE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        \App\Helpers\PhpMyAdmin::ensureInstalled();

        return ApiResponse::success([
            'installed' => \App\Helpers\PhpMyAdmin::isInstalled(),
        ], 'OK', 200);
    }

    public function generatePhpMyAdminToken(Request $request, string $uuidShort, int $databaseId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DATABASE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        if (!$this->canViewPassword($resolved)) {
            return ApiResponse::error('Insufficient permissions to access database credentials', 'FORBIDDEN', 403);
        }

        $pmaPath = dirname(__DIR__, 4) . '/public/pma';
        if (!is_dir($pmaPath) || !file_exists($pmaPath . '/index.php')) {
            return ApiResponse::error('phpMyAdmin is not installed', 'PHPMYADMIN_NOT_INSTALLED', 404);
        }

        $record = WebSpaceDatabase::getWithDetails($databaseId);
        if (!$record || (int) $record['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Database not found', 'NOT_FOUND', 404);
        }

        $databaseHost = DatabaseInstance::getDatabaseById((int) $record['database_host_id']);
        if (!$databaseHost) {
            return ApiResponse::error('Database host not found', 'DATABASE_HOST_NOT_FOUND', 404);
        }

        $app = \App\App::getInstance(true);
        $config = $app->getConfig();
        $appUrl = $config->getSetting('APP_URL', 'https://featherpanel.mythical.systems');
        if (!preg_match('/^https?:\/\//', $appUrl)) {
            $appUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
                . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
        }

        $databaseHostname = DatabaseInstance::getDatabaseHostname($databaseHost);
        $pmaUrl = rtrim($appUrl, '/') . '/pma/token.php?' . http_build_query([
            'db' => $record['database'],
            'host' => $databaseHostname,
            'port' => $record['database_port'] ?? $databaseHost['database_port'] ?? 3306,
            'user' => $record['username'],
            'pass' => $record['password'],
        ]);

        return ApiResponse::success(['url' => $pmaUrl], 'OK', 200);
    }

    /**
     * @param array<string, mixed> $databaseHost
     */
    private function hostAllowedForWebNode(array $databaseHost, int $webNodeId): bool
    {
        $hostWebNodeId = $databaseHost['web_node_id'] ?? null;
        if ($hostWebNodeId === null || $hostWebNodeId === '' || (int) $hostWebNodeId === 0) {
            return true;
        }

        return (int) $hostWebNodeId === $webNodeId;
    }

    /**
     * @param array{user: array<string, mixed>, space: array<string, mixed>} $resolved
     */
    private function canViewPassword(array $resolved): bool
    {
        if (
            !WebSpaceGateway::hasPermission(
                (string) $resolved['user']['uuid'],
                $resolved['space'],
                WebSpaceSubuserPermissions::DATABASE_VIEW_PASSWORD,
            )
        ) {
            return false;
        }

        return true;
    }

    /**
     * @return array{user: array<string, mixed>, space: array<string, mixed>}|Response
     */
    private function resolve(Request $request, string $uuidShort, string $permission): array | Response
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

        $denied = CheckWebSpacePermission::require($request, $space, $permission);
        if ($denied instanceof Response) {
            return $denied;
        }

        return ['user' => $user, 'space' => $space];
    }
}
