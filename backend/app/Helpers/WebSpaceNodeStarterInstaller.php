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

/**
 * Scaffold a minimal Node.js app (package.json + index.js) in a WebSpace directory.
 */
class WebSpaceNodeStarterInstaller
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
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_NODE_STARTER);

        $runtime = self::runtime($space);
        if ($runtime !== 'node') {
            throw new \InvalidArgumentException('Node starter requires a Node.js WebSpace');
        }

        $directory = self::normalizeDirectory((string) ($input['directory'] ?? '/'));
        $uuid = (string) $space['uuid'];
        self::ensureRunning($webNode, $space);
        $containerPath = WebSpaceAppsCatalog::containerPath($runtime, $directory);

        $cmd = 'mkdir -p ' . self::shellQuote($containerPath)
            . ' && cd ' . self::shellQuote($containerPath)
            . ' && if [ ! -f package.json ]; then cat > package.json <<\'EOF\''
            . "\n{\n  \"name\": \"webspace\",\n  \"version\": \"1.0.0\",\n  \"private\": true,\n"
            . "  \"main\": \"index.js\",\n  \"scripts\": { \"start\": \"node index.js\" }\n}\nEOF\nfi"
            . ' && if [ ! -f index.js ]; then cat > index.js <<\'EOF\''
            . "\nconst http = require('http');\nconst port = Number(process.env.PORT || 3000);\n"
            . "http.createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });\n"
            . "  res.end('<h1>Node.js is running</h1><p>Edit index.js to build your app.</p>');\n"
            . "}).listen(port, '0.0.0.0', () => console.log(`Listening on \${port}`));\nEOF\nfi"
            . ' && (npm ci --omit=dev 2>/dev/null || npm install --omit=dev)';

        $output = self::runExec($webNode, $uuid, $cmd, 300, 'Node starter install failed');

        return [
            'directory' => $directory,
            'output' => $output,
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
