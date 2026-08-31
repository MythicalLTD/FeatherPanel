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

use App\Chat\WebPlate;
use App\Chat\WebSpace;
use App\Chat\DatabaseInstance;
use App\Chat\WebSpaceDatabase;

/**
 * One-click Drupal install into a WebSpace subdirectory (drupal/recommended-project + Drush).
 */
class WebSpaceDrupalInstaller
{
    /**
     * @param array<string, mixed> $space
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $input
     *
     * @return array<string, mixed>
     */
    public static function install(array $space, array $webNode, array $input): array
    {
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_DRUPAL);

        $runtime = self::runtime($space);
        if ($runtime !== 'php') {
            throw new \InvalidArgumentException('Drupal requires a PHP WebSpace');
        }

        $directory = self::normalizeDirectory((string) ($input['directory'] ?? '/'));
        $siteName = trim((string) ($input['site_name'] ?? 'Drupal'));
        if ($siteName === '') {
            $siteName = 'Drupal';
        }
        $adminUser = trim((string) ($input['admin_user'] ?? 'admin'));
        if ($adminUser === '') {
            $adminUser = 'admin';
        }
        $adminPassword = (string) ($input['admin_password'] ?? '');
        if ($adminPassword === '') {
            $adminPassword = RemoteDatabaseProvisioner::generateRandomString(16);
        }
        $adminEmail = trim((string) ($input['admin_email'] ?? ''));
        if ($adminEmail === '') {
            $adminEmail = 'admin@example.com';
        }

        $uuid = (string) $space['uuid'];
        self::ensureRunning($webNode, $space);
        $containerPath = WebSpaceAppsCatalog::containerPath($runtime, $directory);
        $parentPath = dirname($containerPath);
        if ($parentPath === $containerPath) {
            $parentPath = '/var/www/html';
        }

        $db = self::provisionDatabase($space, array_merge($input, [
            'database_name' => (string) ($input['database_name'] ?? 'drupal'),
        ]));
        $dbUrl = sprintf(
            'mysql://%s:%s@%s:%d/%s',
            rawurlencode($db['username']),
            rawurlencode($db['password']),
            $db['host'],
            $db['port'],
            $db['database'],
        );

        $primary = self::primaryDomain($space);
        $scheme = !empty($space['ssl']) ? 'https' : 'http';
        $url = $primary !== '' ? $scheme . '://' . $primary : 'http://localhost';
        if ($directory !== '/') {
            $url = rtrim($url, '/') . $directory;
        }
        $webUrl = rtrim($url, '/') . '/web';

        $cmd = 'mkdir -p ' . self::shellQuote($parentPath)
            . ' && cd ' . self::shellQuote($parentPath)
            . ' && rm -rf ' . self::shellQuote(basename($containerPath))
            . ' && composer create-project drupal/recommended-project '
            . self::shellQuote(basename($containerPath))
            . ' --no-interaction --prefer-dist'
            . ' && cd ' . self::shellQuote($containerPath . '/web')
            . ' && ../vendor/bin/drush site:install standard'
            . ' --db-url=' . self::shellQuote($dbUrl)
            . ' --site-name=' . self::shellQuote($siteName)
            . ' --account-name=' . self::shellQuote($adminUser)
            . ' --account-pass=' . self::shellQuote($adminPassword)
            . ' --account-mail=' . self::shellQuote($adminEmail)
            . ' --site-mail=' . self::shellQuote($adminEmail)
            . ' -y --no-interaction';

        $output = self::runExec($webNode, $uuid, $cmd, 900, 'Drupal install failed');

        return [
            'directory' => $directory,
            'url' => $webUrl,
            'admin_user' => $adminUser,
            'admin_password' => $adminPassword,
            'admin_email' => $adminEmail,
            'database' => $db['database'],
            'username' => $db['username'],
            'password' => $db['password'],
            'output' => $output,
            'setup_note' => 'Drupal document root is the web/ subdirectory. Point domain routes or addon paths accordingly.',
        ];
    }

    /**
     * @param array<string, mixed> $space
     */
    private static function runtime(array $space): string
    {
        $runtime = strtolower(trim((string) ($space['webplate_runtime'] ?? '')));
        if ($runtime !== '') {
            return $runtime;
        }
        $plate = WebPlate::getById((int) ($space['webplate_id'] ?? 0));

        return strtolower(trim((string) ($plate['runtime'] ?? 'static')));
    }

    /**
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $space
     */
    private static function ensureRunning(array $webNode, array &$space): void
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
                    WebSpace::updateRuntimeState((string) $space['uuid'], 'running', (int) $body['backend_port']);
                }

                return;
            }
            usleep(500_000);
        }
    }

    /**
     * @param array<string, mixed> $webNode
     */
    private static function runExec(array $webNode, string $uuid, string $cmd, int $timeout, string $fallback): string
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
    private static function provisionDatabase(array $space, array $input): array
    {
        $spaceId = (int) $space['id'];
        $limit = (int) ($space['database_limit'] ?? 1);
        if (WebSpaceLimits::isLimitReached($limit, WebSpaceDatabase::countByWebSpaceId($spaceId))) {
            throw new \RuntimeException('Database limit reached');
        }

        $webNodeId = (int) ($space['web_node_id'] ?? 0);
        $hostId = (int) ($input['database_host_id'] ?? 0);
        $hosts = DatabaseInstance::getDatabasesForWebNode($webNodeId);
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

        $namePart = preg_replace('/[^a-zA-Z0-9_]/', '', (string) ($input['database_name'] ?? 'drupal')) ?: 'drupal';
        $databaseName = 'd' . $spaceId . '_' . substr($namePart, 0, 24);
        $username = 'u' . $spaceId . '_' . RemoteDatabaseProvisioner::generateRandomString(10);
        $password = RemoteDatabaseProvisioner::generateRandomString(16);

        RemoteDatabaseProvisioner::create($databaseHost, $databaseName, $username, $password, '%', 0);
        $recordId = WebSpaceDatabase::create([
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
            'host' => DatabaseInstance::getDatabaseHostname($databaseHost) ?: (string) ($databaseHost['database_host'] ?? '127.0.0.1'),
            'port' => (int) ($databaseHost['database_port'] ?? 3306),
        ];
    }

    /**
     * @param array<string, mixed> $space
     */
    private static function primaryDomain(array $space): string
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

    private static function normalizeDirectory(string $directory): string
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

    private static function shellQuote(string $value): string
    {
        return "'" . str_replace("'", "'\\''", $value) . "'";
    }
}
