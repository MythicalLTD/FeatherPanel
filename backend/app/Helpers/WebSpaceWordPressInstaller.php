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
 * Full WordPress install: files, database, wp-config, admin user.
 */
class WebSpaceWordPressInstaller
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
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_WORDPRESS);

        $runtime = self::runtime($space);
        if ($runtime !== 'php') {
            throw new \InvalidArgumentException('WordPress requires a PHP WebSpace');
        }

        $directory = self::normalizeDirectory((string) ($input['directory'] ?? '/'));
        $title = trim((string) ($input['site_title'] ?? $space['name'] ?? 'WordPress'));
        if ($title === '') {
            $title = 'WordPress';
        }
        $adminUser = trim((string) ($input['admin_user'] ?? 'admin'));
        $adminPassword = (string) ($input['admin_password'] ?? '');
        $adminEmail = trim((string) ($input['admin_email'] ?? (string) ($space['owner_email'] ?? '')));
        if ($adminUser === '' || $adminPassword === '' || $adminEmail === '') {
            throw new \InvalidArgumentException('admin_user, admin_password, and admin_email are required');
        }

        $uuid = (string) $space['uuid'];
        self::ensureRunning($webNode, $space);

        $pull = FeatherQuilldClient::pullWebSpaceFile(
            $webNode,
            $uuid,
            'https://wordpress.org/latest.zip',
            $directory,
            'wordpress.zip',
        );
        if (!$pull['ok']) {
            throw new \RuntimeException($pull['error'] ?? 'Failed to download WordPress');
        }

        $zipPath = rtrim($directory, '/') . '/wordpress.zip';
        $decompress = FeatherQuilldClient::decompressWebSpaceFile($webNode, $uuid, $zipPath, $directory);
        if (!$decompress['ok']) {
            throw new \RuntimeException($decompress['error'] ?? 'Failed to extract WordPress');
        }

        $containerPath = WebSpaceAppsCatalog::containerPath($runtime, $directory);
        $flatten = FeatherQuilldClient::execWebSpaceCommand(
            $webNode,
            $uuid,
            'cd ' . self::shellQuote($containerPath)
            . ' && rm -f wordpress.zip'
            . ' && if [ -d wordpress ]; then find wordpress -mindepth 1 -maxdepth 1 -exec mv -t . {} +; rmdir wordpress; fi',
            120,
        );
        if (!$flatten['ok']) {
            throw new \RuntimeException($flatten['error'] ?? 'Failed to flatten WordPress files');
        }

        $db = self::provisionDatabase($space, $input);
        $primary = self::primaryDomain($space);
        $scheme = !empty($space['ssl']) ? 'https' : 'http';
        $url = $primary !== '' ? $scheme . '://' . $primary : 'http://localhost';
        $dbHost = $db['host'] . ($db['port'] > 0 ? ':' . $db['port'] : '');

        $wpCli = 'php -r ' . self::shellQuote("copy('https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar','/tmp/wp-cli.phar');")
            . ' && php /tmp/wp-cli.phar core config --allow-root --skip-check'
            . ' --path=' . self::shellQuote($containerPath)
            . ' --dbname=' . self::shellQuote($db['database'])
            . ' --dbuser=' . self::shellQuote($db['username'])
            . ' --dbpass=' . self::shellQuote($db['password'])
            . ' --dbhost=' . self::shellQuote($dbHost)
            . ' --dbcharset=utf8mb4'
            . ' && php /tmp/wp-cli.phar core install --allow-root --skip-email'
            . ' --path=' . self::shellQuote($containerPath)
            . ' --url=' . self::shellQuote($url)
            . ' --title=' . self::shellQuote($title)
            . ' --admin_user=' . self::shellQuote($adminUser)
            . ' --admin_password=' . self::shellQuote($adminPassword)
            . ' --admin_email=' . self::shellQuote($adminEmail);

        $install = FeatherQuilldClient::execWebSpaceCommand($webNode, $uuid, $wpCli, 180);
        if (!$install['ok']) {
            throw new \RuntimeException($install['error'] ?? 'wp-cli failed');
        }

        $body = is_array($install['body']) ? $install['body'] : [];
        $exit = (int) ($body['exit_code'] ?? 0);
        $output = (string) ($body['output'] ?? '');
        if ($exit !== 0) {
            throw new \RuntimeException($output !== '' ? $output : 'WordPress install command failed');
        }

        return [
            'directory' => $directory,
            'url' => $url,
            'database' => $db['database'],
            'username' => $db['username'],
            'password' => $db['password'],
            'admin_user' => $adminUser,
            'admin_email' => $adminEmail,
            'output' => $output,
        ];
    }

    /**
     * Update WordPress core, plugins, and the database schema via wp-cli.
     *
     * @param array<string, mixed> $space
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $input
     *
     * @return array<string, mixed>
     */
    public static function update(array $space, array $webNode, array $input): array
    {
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_WORDPRESS);

        $directory = self::normalizeDirectory((string) ($input['directory'] ?? '/'));
        $uuid = (string) $space['uuid'];
        self::ensureRunning($webNode, $space);
        $containerPath = self::containerPath($directory);

        $cmd = self::wpCliBootstrap()
            . ' && php /tmp/wp-cli.phar core update --allow-root --path=' . self::shellQuote($containerPath)
            . ' && php /tmp/wp-cli.phar plugin update --all --allow-root --path=' . self::shellQuote($containerPath)
            . ' && php /tmp/wp-cli.phar core update-db --allow-root --path=' . self::shellQuote($containerPath);

        $output = self::runExec($webNode, $uuid, $cmd, 300, 'WordPress update failed');

        return [
            'directory' => $directory,
            'output' => $output,
        ];
    }

    /**
     * Clone an existing WordPress install into a subdirectory with its own database.
     *
     * @param array<string, mixed> $space
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $input
     *
     * @return array<string, mixed>
     */
    public static function staging(array $space, array $webNode, array $input): array
    {
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_WORDPRESS);

        $source = self::normalizeDirectory((string) ($input['source'] ?? '/'));
        $directory = self::normalizeDirectory((string) ($input['directory'] ?? '/staging'));
        if ($source === $directory) {
            throw new \InvalidArgumentException('Staging directory must differ from the source');
        }

        $uuid = (string) $space['uuid'];
        self::ensureRunning($webNode, $space);
        $srcPath = self::containerPath($source);
        $dstPath = self::containerPath($directory);

        $copy = FeatherQuilldClient::execWebSpaceCommand(
            $webNode,
            $uuid,
            'mkdir -p ' . self::shellQuote($dstPath)
            . ' && cp -a ' . self::shellQuote($srcPath) . '/. ' . self::shellQuote($dstPath) . '/',
            180,
        );
        if (!$copy['ok']) {
            throw new \RuntimeException($copy['error'] ?? 'Failed to copy WordPress files');
        }

        $db = self::provisionDatabase($space, array_merge($input, [
            'database_name' => (string) ($input['database_name'] ?? 'wpstg'),
        ]));
        $dbHost = $db['host'] . ($db['port'] > 0 ? ':' . $db['port'] : '');
        $primary = self::primaryDomain($space);
        $scheme = !empty($space['ssl']) ? 'https' : 'http';
        $liveUrl = $primary !== '' ? $scheme . '://' . $primary : 'http://localhost';
        $stagingUrl = rtrim($liveUrl, '/') . ($directory === '/' ? '' : $directory);

        $cmd = self::wpCliBootstrap()
            . ' && php /tmp/wp-cli.phar db export /tmp/fp-wp-staging.sql --allow-root --path=' . self::shellQuote($srcPath)
            . ' && php /tmp/wp-cli.phar config set DB_NAME ' . self::shellQuote($db['database'])
            . ' --allow-root --path=' . self::shellQuote($dstPath)
            . ' && php /tmp/wp-cli.phar config set DB_USER ' . self::shellQuote($db['username'])
            . ' --allow-root --path=' . self::shellQuote($dstPath)
            . ' && php /tmp/wp-cli.phar config set DB_PASSWORD ' . self::shellQuote($db['password'])
            . ' --allow-root --path=' . self::shellQuote($dstPath)
            . ' && php /tmp/wp-cli.phar config set DB_HOST ' . self::shellQuote($dbHost)
            . ' --allow-root --path=' . self::shellQuote($dstPath)
            . ' && php /tmp/wp-cli.phar db import /tmp/fp-wp-staging.sql --allow-root --path=' . self::shellQuote($dstPath)
            . ' && php /tmp/wp-cli.phar search-replace ' . self::shellQuote($liveUrl) . ' ' . self::shellQuote($stagingUrl)
            . ' --allow-root --skip-columns=guid --path=' . self::shellQuote($dstPath)
            . ' ; rm -f /tmp/fp-wp-staging.sql';

        $output = self::runExec($webNode, $uuid, $cmd, 300, 'WordPress staging failed');

        return [
            'source' => $source,
            'directory' => $directory,
            'url' => $stagingUrl,
            'database' => $db['database'],
            'username' => $db['username'],
            'password' => $db['password'],
            'output' => $output,
        ];
    }

    /**
     * Copy a staging WordPress install back to production (files + database + URL replace).
     *
     * @param array<string, mixed> $space
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $input
     *
     * @return array<string, mixed>
     */
    public static function promoteStaging(array $space, array $webNode, array $input): array
    {
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_WORDPRESS);

        $source = self::normalizeDirectory((string) ($input['source'] ?? '/'));
        $staging = self::normalizeDirectory((string) ($input['directory'] ?? '/staging'));
        if ($source === $staging) {
            throw new \InvalidArgumentException('Staging directory must differ from production');
        }

        $uuid = (string) $space['uuid'];
        self::ensureRunning($webNode, $space);
        $srcPath = self::containerPath($source);
        $stgPath = self::containerPath($staging);

        $primary = self::primaryDomain($space);
        $scheme = !empty($space['ssl']) ? 'https' : 'http';
        $liveUrl = $primary !== '' ? $scheme . '://' . $primary : 'http://localhost';
        $stagingUrl = rtrim($liveUrl, '/') . ($staging === '/' ? '' : $staging);

        $cmd = self::wpCliBootstrap()
            . ' && PROD_DB=$(php /tmp/wp-cli.phar config get DB_NAME --allow-root --path=' . self::shellQuote($srcPath) . ')'
            . ' && PROD_USER=$(php /tmp/wp-cli.phar config get DB_USER --allow-root --path=' . self::shellQuote($srcPath) . ')'
            . ' && PROD_PASS=$(php /tmp/wp-cli.phar config get DB_PASSWORD --allow-root --path=' . self::shellQuote($srcPath) . ')'
            . ' && PROD_HOST=$(php /tmp/wp-cli.phar config get DB_HOST --allow-root --path=' . self::shellQuote($srcPath) . ')'
            . ' && php /tmp/wp-cli.phar db export /tmp/fp-wp-promote.sql --allow-root --path=' . self::shellQuote($stgPath)
            . ' && find ' . self::shellQuote($srcPath) . ' -mindepth 1 -maxdepth 1 ! -name ' . self::shellQuote('.featherpanel-trash')
            . ' ! -name ' . self::shellQuote('.install') . ' -exec rm -rf {} +'
            . ' && cp -a ' . self::shellQuote($stgPath) . '/. ' . self::shellQuote($srcPath) . '/'
            . ' && php /tmp/wp-cli.phar config set DB_NAME "$PROD_DB" --allow-root --path=' . self::shellQuote($srcPath)
            . ' && php /tmp/wp-cli.phar config set DB_USER "$PROD_USER" --allow-root --path=' . self::shellQuote($srcPath)
            . ' && php /tmp/wp-cli.phar config set DB_PASSWORD "$PROD_PASS" --allow-root --path=' . self::shellQuote($srcPath)
            . ' && php /tmp/wp-cli.phar config set DB_HOST "$PROD_HOST" --allow-root --path=' . self::shellQuote($srcPath)
            . ' && php /tmp/wp-cli.phar db import /tmp/fp-wp-promote.sql --allow-root --path=' . self::shellQuote($srcPath)
            . ' && php /tmp/wp-cli.phar search-replace ' . self::shellQuote($stagingUrl) . ' ' . self::shellQuote($liveUrl)
            . ' --allow-root --skip-columns=guid --path=' . self::shellQuote($srcPath)
            . ' ; rm -f /tmp/fp-wp-promote.sql';

        $output = self::runExec($webNode, $uuid, $cmd, 300, 'WordPress staging promote failed');

        return [
            'source' => $source,
            'directory' => $staging,
            'url' => $liveUrl,
            'output' => $output,
        ];
    }

    /**
     * Install and activate a plugin by slug via wp-cli.
     *
     * @param array<string, mixed> $space
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $input
     *
     * @return array<string, mixed>
     */
    public static function installPlugin(array $space, array $webNode, array $input): array
    {
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_WORDPRESS);

        $slug = strtolower(trim((string) ($input['slug'] ?? '')));
        if ($slug === '' || !preg_match('/^[a-z0-9\-]+$/', $slug)) {
            throw new \InvalidArgumentException('A valid plugin slug is required');
        }

        $directory = self::normalizeDirectory((string) ($input['directory'] ?? '/'));
        $uuid = (string) $space['uuid'];
        self::ensureRunning($webNode, $space);
        $containerPath = self::containerPath($directory);

        $cmd = self::wpCliBootstrap()
            . ' && php /tmp/wp-cli.phar plugin install ' . self::shellQuote($slug)
            . ' --activate --allow-root --path=' . self::shellQuote($containerPath);

        $output = self::runExec($webNode, $uuid, $cmd, 300, 'WordPress plugin install failed');

        return [
            'directory' => $directory,
            'slug' => $slug,
            'output' => $output,
        ];
    }

    /**
     * Shell command suitable for a schedule <c>command</c> task (runs inside the container).
     */
    public static function buildUpdateCommand(string $directory = '/'): string
    {
        $containerPath = self::containerPath(self::normalizeDirectory($directory));

        return self::wpCliBootstrap()
            . ' && php /tmp/wp-cli.phar core update --allow-root --path=' . self::shellQuote($containerPath)
            . ' && php /tmp/wp-cli.phar plugin update --all --allow-root --path=' . self::shellQuote($containerPath)
            . ' && php /tmp/wp-cli.phar core update-db --allow-root --path=' . self::shellQuote($containerPath);
    }

    private static function wpCliBootstrap(): string
    {
        return 'php -r ' . self::shellQuote("copy('https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar','/tmp/wp-cli.phar');");
    }

    private static function containerPath(string $directory): string
    {
        return WebSpaceAppsCatalog::containerPath('php', $directory);
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

        $namePart = preg_replace('/[^a-zA-Z0-9_]/', '', (string) ($input['database_name'] ?? 'wp')) ?: 'wp';
        $databaseName = 'w' . $spaceId . '_' . substr($namePart, 0, 24);
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
