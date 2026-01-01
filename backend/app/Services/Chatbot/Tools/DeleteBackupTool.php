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
use App\Chat\Node;
use App\Chat\Backup;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Services\Wings\Wings;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerBackupEvent;

/**
 * Tool to delete a backup for a server.
 */
class DeleteBackupTool implements ToolInterface
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
                'action_type' => 'delete_backup',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'delete_backup',
            ];
        }

        // Get backup identifier (UUID or name)
        $backupUuid = $params['backup_uuid'] ?? null;
        $backupName = $params['backup_name'] ?? null;
        $backup = null;

        if ($backupUuid) {
            $backup = Backup::getBackupByUuid($backupUuid);
        } elseif ($backupName) {
            // Get all backups for this server and find by name
            $backups = Backup::getBackupsByServerId($server['id']);
            foreach ($backups as $b) {
                if ($b['name'] === $backupName) {
                    $backup = $b;
                    break;
                }
            }
        }

        if (!$backup) {
            return [
                'success' => false,
                'error' => 'Backup not found. Please specify a backup UUID or name.',
                'action_type' => 'delete_backup',
            ];
        }

        // Verify backup belongs to this server
        if ($backup['server_id'] != $server['id']) {
            return [
                'success' => false,
                'error' => 'Backup not found on this server',
                'action_type' => 'delete_backup',
            ];
        }

        // Check if backup is locked
        if ($backup['is_locked'] == 1) {
            return [
                'success' => false,
                'error' => 'Backup is currently locked. Please unlock it first or wait for it to complete.',
                'action_type' => 'delete_backup',
            ];
        }

        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return [
                'success' => false,
                'error' => 'Node not found',
                'action_type' => 'delete_backup',
            ];
        }

        // Delete backup from Wings
        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $response = $wings->getServer()->deleteBackup($server['uuid'], $backup['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return [
                    'success' => false,
                    'error' => "Failed to delete backup on Wings: {$error}",
                    'action_type' => 'delete_backup',
                ];
            }
        } catch (\Exception $e) {
            $this->app->getLogger()->error('DeleteBackupTool error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to delete backup on Wings: ' . $e->getMessage(),
                'action_type' => 'delete_backup',
            ];
        }

        // Delete backup record from database
        if (!Backup::deleteBackup($backup['id'])) {
            return [
                'success' => false,
                'error' => 'Failed to delete backup record',
                'action_type' => 'delete_backup',
            ];
        }

        // Log activity
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => $user['id'],
            'event' => 'backup_deleted',
            'metadata' => json_encode([
                'backup_uuid' => $backup['uuid'],
                'backup_name' => $backup['name'],
            ]),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerBackupEvent::onServerBackupDeleted(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
                    'backup_uuid' => $backup['uuid'],
                ]
            );
        }

        return [
            'success' => true,
            'action_type' => 'delete_backup',
            'backup_id' => $backup['id'],
            'backup_uuid' => $backup['uuid'],
            'backup_name' => $backup['name'],
            'server_name' => $server['name'],
            'message' => "Backup '{$backup['name']}' deleted successfully from server '{$server['name']}'",
        ];
    }

    public function getDescription(): string
    {
        return 'Delete a backup for a server. Requires backup UUID or name. Cannot delete locked backups (backups that are currently in progress).';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'backup_uuid' => 'Backup UUID (required if backup_name not provided)',
            'backup_name' => 'Backup name (required if backup_uuid not provided)',
        ];
    }
}
