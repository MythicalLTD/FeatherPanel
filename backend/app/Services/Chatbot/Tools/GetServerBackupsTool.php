<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Services\Chatbot\Tools;

use App\App;
use App\Chat\Backup;
use App\Chat\Server;
use App\Helpers\ServerGateway;

/**
 * Tool to get server backups.
 */
class GetServerBackupsTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        // Get server identifier
        $serverIdentifier = $params['server_uuid'] ?? $params['server_name'] ?? null;
        $server = null;

        // If no identifier provided, try to get server from pageContext
        if (!$serverIdentifier && isset($pageContext['server'])) {
            $contextServer = $pageContext['server'];
            $serverUuidShort = $contextServer['uuidShort'] ?? null;

            if ($serverUuidShort) {
                $server = Server::getServerByUuidShort($serverUuidShort);
            }
        }

        // Resolve server if identifier provided
        if ($serverIdentifier && !$server) {
            $server = Server::getServerByUuid($serverIdentifier);

            if (!$server) {
                $server = Server::getServerByUuidShort($serverIdentifier);
            }

            if (!$server) {
                $servers = Server::searchServers(
                    page: 1,
                    limit: 10,
                    search: $serverIdentifier,
                    ownerId: $user['id']
                );
                if (!empty($servers)) {
                    $server = $servers[0];
                }
            }
        }

        if (!$server) {
            return [
                'error' => 'Server not found. Please specify a server UUID or name, or ensure you are viewing a server page.',
                'backups' => [],
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'error' => 'Access denied to server',
                'backups' => [],
            ];
        }

        // Get limit
        $limit = isset($params['limit']) ? (int) $params['limit'] : 20;

        // Get backups
        $backups = Backup::getBackupsByServerId((int) $server['id']);

        // Apply limit
        if ($limit > 0) {
            $backups = array_slice($backups, 0, $limit);
        }

        // Format backups
        $formatted = [];
        foreach ($backups as $backup) {
            $formatted[] = [
                'id' => (int) $backup['id'],
                'uuid' => $backup['uuid'],
                'name' => $backup['name'] ?? null,
                'is_successful' => (bool) $backup['is_successful'],
                'is_locked' => (bool) $backup['is_locked'],
                'disk' => $backup['disk'] ?? null,
                'created_at' => $backup['created_at'],
                'updated_at' => $backup['updated_at'],
            ];
        }

        return [
            'server_name' => $server['name'],
            'server_uuid' => $server['uuid'],
            'backups' => $formatted,
            'count' => count($formatted),
            'successful_count' => count(array_filter($formatted, fn ($b) => $b['is_successful'])),
            'locked_count' => count(array_filter($formatted, fn ($b) => $b['is_locked'])),
        ];
    }

    public function getDescription(): string
    {
        return 'Get server backups. Returns recent backups with their status (successful/failed), lock status, and creation dates.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'limit' => 'Maximum number of backups to return (optional, default: 20)',
        ];
    }
}
