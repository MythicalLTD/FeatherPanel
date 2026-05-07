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

namespace App\Services\Chatbot\Tools;

use App\Chat\Server;
use App\Chat\ServerImport;
use App\Helpers\ServerGateway;

/**
 * Tool to get import jobs for a server.
 */
class GetServerImportsTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $serverIdentifier = $params['server_uuid'] ?? $params['server_name'] ?? null;
        $server = null;

        if (!$serverIdentifier && isset($pageContext['server'])) {
            $contextServer = $pageContext['server'];
            $serverUuidShort = $contextServer['uuidShort'] ?? null;

            if ($serverUuidShort) {
                $server = Server::getServerByUuidShort($serverUuidShort);
            }
        }

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
                'imports' => [],
            ];
        }

        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'error' => 'Access denied to server',
                'imports' => [],
            ];
        }

        $imports = ServerImport::getByServerId((int) $server['id']);
        $formatted = array_map(static function (array $import): array {
            return [
                'id' => (int) ($import['id'] ?? 0),
                'host' => $import['host'] ?? null,
                'port' => isset($import['port']) ? (int) $import['port'] : null,
                'user' => $import['user'] ?? null,
                'source_location' => $import['source_location'] ?? null,
                'destination_location' => $import['destination_location'] ?? null,
                'type' => $import['type'] ?? null,
                'wipe' => !empty($import['wipe']),
                'wipe_all_files' => !empty($import['wipe_all_files']),
                'status' => $import['status'] ?? null,
                'error' => $import['error'] ?? null,
                'started_at' => $import['started_at'] ?? null,
                'completed_at' => $import['completed_at'] ?? null,
                'created_at' => $import['created_at'] ?? null,
                'updated_at' => $import['updated_at'] ?? null,
            ];
        }, $imports);

        return [
            'server_name' => $server['name'],
            'server_uuid' => $server['uuid'],
            'imports' => $formatted,
            'count' => count($formatted),
        ];
    }

    public function getDescription(): string
    {
        return 'Get all server import jobs and their statuses (pending, importing, completed, failed).';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
        ];
    }
}
