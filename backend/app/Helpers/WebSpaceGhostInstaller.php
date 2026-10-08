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

class WebSpaceGhostInstaller
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
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_GHOST);
        $runtime = self::runtime($space);
        if ($runtime !== 'node') {
            throw new \InvalidArgumentException('Ghost requires a Node.js WebSpace');
        }

        $directory = self::normalizeDirectory((string) ($input['directory'] ?? '/'));
        $adminEmail = trim((string) ($input['admin_email'] ?? 'admin@example.com'));
        $adminPassword = (string) ($input['admin_password'] ?? '');
        if ($adminPassword === '') {
            $adminPassword = RemoteDatabaseProvisioner::generateRandomString(16);
        }
        $siteTitle = trim((string) ($input['site_title'] ?? 'Ghost'));

        $uuid = (string) $space['uuid'];
        self::ensureRunning($webNode, $space);
        $containerPath = WebSpaceAppsCatalog::containerPath($runtime, $directory);

        $domain = self::primaryDomain($space) ?: 'localhost';
        $scheme = !empty($space['ssl']) ? 'https' : 'http';
        $url = $directory === '/' ? $scheme . '://' . $domain : rtrim($scheme . '://' . $domain, '/') . $directory;

        $configJson = json_encode([
            'url' => $url,
            'server' => ['port' => 2368, 'host' => '127.0.0.1'],
            'logging' => ['transports' => ['file', 'stdout']],
            'database' => [
                'client' => 'sqlite3',
                'connection' => ['filename' => $containerPath . '/content/data/ghost.db'],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $cmd = 'mkdir -p ' . self::shellQuote($containerPath . '/content/data')
            . ' && cd ' . self::shellQuote($containerPath)
            . ' && npm install ghost@5 --omit=dev --no-audit --no-fund'
            . ' && cat > config.production.json <<\'EOF\''
            . "\n" . $configJson . "\nEOF"
            . ' && NODE_ENV=production node node_modules/ghost/current/index.js setup'
            . ' --admin-email ' . self::shellQuote($adminEmail)
            . ' --admin-password ' . self::shellQuote($adminPassword)
            . ' --blog-title ' . self::shellQuote($siteTitle)
            . ' --no-prompt 2>/dev/null || true';

        $output = self::runExec($webNode, $uuid, $cmd, 600, 'Ghost install failed');

        return [
            'directory' => $directory,
            'url' => $url,
            'admin_email' => $adminEmail,
            'admin_password' => $adminPassword,
            'output' => $output,
            'setup_note' => 'Configure your WebPlate start command to run Ghost from this directory (port 2368).',
        ];
    }

    /** @param array<string, mixed> $space */
    private static function runtime(array $space): string
    {
        $runtime = strtolower(trim((string) ($space['webplate_runtime'] ?? '')));
        if ($runtime !== '') {
            return $runtime;
        }
        $plate = WebPlate::getById((int) ($space['webplate_id'] ?? 0));

        return strtolower(trim((string) ($plate['runtime'] ?? 'static')));
    }

    /** @param array<string, mixed> $webNode @param array<string, mixed> $space */
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

    /** @param array<string, mixed> $webNode */
    private static function runExec(array $webNode, string $uuid, string $cmd, int $timeout, string $fallback): string
    {
        $result = FeatherQuilldClient::execWebSpaceCommand($webNode, $uuid, $cmd, $timeout);
        if (!$result['ok']) {
            throw new \RuntimeException($result['error'] ?? $fallback);
        }
        $body = is_array($result['body']) ? $result['body'] : [];
        if ((int) ($body['exit_code'] ?? 0) !== 0) {
            $output = (string) ($body['output'] ?? '');

            throw new \RuntimeException($output !== '' ? $output : $fallback);
        }

        return (string) ($body['output'] ?? '');
    }

    /** @param array<string, mixed> $space */
    private static function primaryDomain(array $space): string
    {
        $domains = $space['domains'] ?? [];

        return is_array($domains) && isset($domains[0]) ? strtolower(trim((string) $domains[0])) : '';
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
