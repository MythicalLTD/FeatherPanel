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

namespace App\Helpers;

/**
 * Shared helpers for PHP app one-click installers (DB + exec).
 */
trait WebSpacePhpAppInstallerTrait
{
    /**
     * @param array<string, mixed> $space
     */
    private static function phpRuntime(array $space): string
    {
        $runtime = strtolower(trim((string) ($space['webplate_runtime'] ?? '')));
        if ($runtime !== '') {
            return $runtime;
        }
        $plate = \App\Chat\WebPlate::getById((int) ($space['webplate_id'] ?? 0));

        return strtolower(trim((string) ($plate['runtime'] ?? 'static')));
    }

    /**
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $space
     */
    private static function ensureWebSpaceRunning(array $webNode, array &$space): void
    {
        $state = strtolower(trim((string) ($space['state'] ?? '')));
        if ($state === 'running') {
            return;
        }

        $power = FeatherQuilldClient::powerWebSpace($webNode, (string) $space['uuid'], 'start');
        if (!$power['ok']) {
            throw new \RuntimeException($power['error'] ?? 'Failed to start WebSpace');
        }

        $deadline = time() + 30;
        while (time() < $deadline) {
            $status = FeatherQuilldClient::getWebSpaceStatus($webNode, (string) $space['uuid']);
            $body = is_array($status['body']) ? $status['body'] : [];
            if (strtolower((string) ($body['state'] ?? '')) === 'running') {
                $space['state'] = 'running';
                if (isset($body['backend_port'])) {
                    \App\Chat\WebSpace::updateRuntimeState((string) $space['uuid'], 'running', (int) $body['backend_port']);
                }

                return;
            }
            usleep(500_000);
        }
    }

    /**
     * @param array<string, mixed> $webNode
     */
    private static function execInWebSpace(array $webNode, string $uuid, string $cmd, int $timeout, string $fallback): string
    {
        $result = FeatherQuilldClient::execWebSpaceCommand($webNode, $uuid, $cmd, $timeout);
        if (!$result['ok']) {
            throw new \RuntimeException($result['error'] ?? $fallback);
        }
        $body = is_array($result['body']) ? $result['body'] : [];
        $exit = (int) ($body['exit_code'] ?? 0);
        $output = (string) ($body['output'] ?? '');
        if ($exit !== 0) {
            throw new \RuntimeException($output !== '' ? $output : $fallback);
        }

        return $output;
    }

    /**
     * @param array<string, mixed> $space
     * @param array<string, mixed> $input
     *
     * @return array{database: string, username: string, password: string, host: string, port: int}
     */
    private static function provisionAppDatabase(array $space, array $input, string $defaultName): array
    {
        $spaceId = (int) $space['id'];
        $limit = (int) ($space['database_limit'] ?? 1);
        if (WebSpaceLimits::isLimitReached($limit, \App\Chat\WebSpaceDatabase::countByWebSpaceId($spaceId))) {
            throw new \RuntimeException('Database limit reached');
        }

        $webNodeId = (int) ($space['web_node_id'] ?? 0);
        $hostId = (int) ($input['database_host_id'] ?? 0);
        $hosts = \App\Chat\DatabaseInstance::getDatabasesForWebNode($webNodeId);
        $databaseHost = null;
        foreach ($hosts as $host) {
            if ($hostId > 0 && (int) ($host['id'] ?? 0) === $hostId) {
                $databaseHost = $host;
                break;
            }
        }
        if ($databaseHost === null && $hosts !== []) {
            $databaseHost = $hosts[0];
        }
        if (!$databaseHost) {
            throw new \RuntimeException('No database host is available for this WebSpace');
        }

        $namePart = preg_replace('/[^a-zA-Z0-9_]/', '', (string) ($input['database_name'] ?? $defaultName)) ?: $defaultName;
        $databaseName = 'd' . $spaceId . '_' . substr($namePart, 0, 24);
        $username = 'u' . $spaceId . '_' . RemoteDatabaseProvisioner::generateRandomString(10);
        $password = RemoteDatabaseProvisioner::generateRandomString(16);

        RemoteDatabaseProvisioner::create($databaseHost, $databaseName, $username, $password, '%', 0);
        $recordId = \App\Chat\WebSpaceDatabase::create([
            'webspace_id' => $spaceId,
            'database_host_id' => (int) $databaseHost['id'],
            'database' => $databaseName,
            'username' => $username,
            'password' => $password,
            'remote' => '%',
            'max_connections' => 0,
        ]);
        if ($recordId === false) {
            try {
                RemoteDatabaseProvisioner::delete($databaseHost, $databaseName, $username, '%');
            } catch (\Throwable) {
            }
            throw new \RuntimeException('Failed to save database record');
        }

        return [
            'database' => $databaseName,
            'username' => $username,
            'password' => $password,
            'host' => \App\Chat\DatabaseInstance::getDatabaseHostname($databaseHost) ?: (string) ($databaseHost['database_host'] ?? '127.0.0.1'),
            'port' => (int) ($databaseHost['database_port'] ?? 3306),
        ];
    }

    /**
     * @param array<string, mixed> $space
     */
    private static function primaryAppDomain(array $space): string
    {
        $routes = $space['domain_routes'] ?? [];
        if (is_array($routes)) {
            foreach ($routes as $route) {
                if (is_array($route) && ($route['type'] ?? '') === 'primary') {
                    return strtolower(trim((string) ($route['domain'] ?? '')));
                }
            }
            foreach ($routes as $route) {
                if (is_array($route) && !empty($route['domain']) && ($route['type'] ?? '') !== 'redirect') {
                    return strtolower(trim((string) $route['domain']));
                }
            }
        }

        $domains = $space['domains'] ?? [];
        if (is_array($domains) && isset($domains[0])) {
            return strtolower(trim((string) $domains[0]));
        }

        return '';
    }

    private static function normalizeAppDirectory(string $directory): string
    {
        $directory = trim($directory);
        if ($directory === '') {
            return '/';
        }
        if (!str_starts_with($directory, '/')) {
            $directory = '/' . $directory;
        }

        return rtrim($directory, '/') === '' ? '/' : rtrim($directory, '/');
    }

    private static function shellQuoteApp(string $value): string
    {
        return "'" . str_replace("'", "'\\''", $value) . "'";
    }
}
