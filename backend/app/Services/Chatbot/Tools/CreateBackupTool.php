<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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
use App\Chat\Node;
use App\Chat\Backup;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Services\Wings\Wings;
use App\Helpers\ServerGateway;

/**
 * Tool to create a backup for a server.
 */
class CreateBackupTool implements ToolInterface
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
                'success' => false,
                'error' => 'Server not found. Please specify a server UUID or name, or ensure you are viewing a server page.',
                'action_type' => 'create_backup',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'create_backup',
            ];
        }

        // Check backup limit
        $currentBackups = count(Backup::getBackupsByServerId((int) $server['id']));
        $backupLimit = (int) ($server['backup_limit'] ?? 1);

        if ($currentBackups >= $backupLimit) {
            return [
                'success' => false,
                'error' => 'Backup limit reached for this server',
                'action_type' => 'create_backup',
                'current_count' => $currentBackups,
                'limit' => $backupLimit,
            ];
        }

        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return [
                'success' => false,
                'error' => 'Node not found',
                'action_type' => 'create_backup',
            ];
        }

        // Generate backup UUID
        $backupUuid = $this->generateUuid();

        // Generate backup name
        $backupName = $params['name'] ?? 'Backup at ' . date('Y-m-d H:i:s');

        // Get ignore files
        $ignoredFiles = $params['ignore'] ?? '[]';
        if (is_array($ignoredFiles)) {
            $ignoredFiles = json_encode($ignoredFiles);
        }

        // Create backup record in database
        $backupData = [
            'server_id' => $server['id'],
            'uuid' => $backupUuid,
            'name' => $backupName,
            'ignored_files' => $ignoredFiles,
            'disk' => 'wings',
            'is_successful' => 0,
            'is_locked' => 1, // Lock while backup is in progress
        ];

        $backupId = Backup::createBackup($backupData);
        if (!$backupId) {
            return [
                'success' => false,
                'error' => 'Failed to create backup record',
                'action_type' => 'create_backup',
            ];
        }

        // Initiate backup on Wings
        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $response = $wings->getServer()->createBackup($server['uuid'], 'wings', $backupUuid, $ignoredFiles);

            if (!$response->isSuccessful()) {
                // Rollback database record
                Backup::deleteBackup($backupId);

                $error = $response->getError();

                return [
                    'success' => false,
                    'error' => 'Failed to initiate backup on Wings: ' . $error,
                    'action_type' => 'create_backup',
                ];
            }
        } catch (\Exception $e) {
            // Rollback database record
            Backup::deleteBackup($backupId);
            $this->app->getLogger()->error('CreateBackupTool error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to initiate backup: ' . $e->getMessage(),
                'action_type' => 'create_backup',
            ];
        }

        // Log activity
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => $user['id'],
            'event' => 'backup_created',
            'metadata' => json_encode([
                'backup_uuid' => $backupUuid,
                'backup_name' => $backupName,
            ]),
        ]);

        return [
            'success' => true,
            'action_type' => 'create_backup',
            'backup_id' => $backupId,
            'backup_uuid' => $backupUuid,
            'backup_name' => $backupName,
            'server_name' => $server['name'],
            'message' => "Backup '{$backupName}' created successfully for server '{$server['name']}'",
        ];
    }

    public function getDescription(): string
    {
        return 'Create a new backup for a server. The backup will be initiated immediately and run in the background. Returns backup details upon successful creation.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'name' => 'Backup name (optional, will be auto-generated if not provided)',
            'ignore' => 'JSON array of files to ignore (optional, default: [])',
        ];
    }

    /**
     * Generate UUID v4.
     */
    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0F | 0x40); // set version to 0100
        $data[8] = chr(ord($data[8]) & 0x3F | 0x80); // set bits 6-7 to 10

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
