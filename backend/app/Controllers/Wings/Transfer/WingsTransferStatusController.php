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

namespace App\Controllers\Wings\Transfer;

use App\App;
use App\Chat\Node;
use App\Chat\Backup;
use App\Chat\Server;
use App\Chat\Allocation;
use App\Chat\ServerTransfer;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Wings Transfer Status Controller.
 *
 * Handles transfer status callbacks from Wings nodes (both source and destination).
 * According to Wings architecture:
 * - Destination node reports success (successful=true)
 * - Source node reports failures (successful=false)
 */
class WingsTransferStatusController
{
    /**
     * Report transfer status from Wings.
     *
     * This endpoint receives callbacks from Wings nodes to report transfer outcomes.
     * The destination reports success, while the source reports failures.
     *
     * Expected payload:
     * {
     *   "successful": true/false,
     *   "server_uuid": "uuid-of-server",
     *   "node_id": "id-of-destination-node" (optional, for successful transfers),
     *   "error": "error message if failed" (optional)
     * }
     */
    public function setTransferStatus(Request $request, string $uuid): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        // Validate required fields
        if (!isset($data['successful'])) {
            return ApiResponse::error('Missing required field: successful', 'MISSING_FIELD', 400);
        }

        $successful = (bool) $data['successful'];
        $error = $data['error'] ?? null;
        $destinationNodeId = $data['node_id'] ?? null;

        // Find server by UUID
        $server = Server::getServerByUuid($uuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Log the transfer status
        $logger = App::getInstance(true)->getLogger();
        $logger->info('Transfer status received for server ' . $uuid . ': ' . ($successful ? 'success' : 'failed') . ($error ? ' - ' . $error : ''));

        if ($successful) {
            // Transfer succeeded - update server to its new node if provided
            $updateData = ['status' => 'offline'];

            // If destination node ID is provided, update the server's node assignment
            if ($destinationNodeId !== null) {
                $destinationNode = Node::getNodeById((int) $destinationNodeId);
                if ($destinationNode) {
                    $updateData['node_id'] = (int) $destinationNodeId;
                    $logger->info('Updating server ' . $uuid . ' to destination node ID: ' . $destinationNodeId);
                } else {
                    $logger->warning('Destination node ID ' . $destinationNodeId . ' not found, keeping current node assignment');
                }
            }

            // Update server status to offline (waiting for it to be started on new node)
            Server::updateServerById($server['id'], $updateData);

            // Update transfer record in database
            ServerTransfer::updateByServerId($server['id'], [
                'status' => 'completed',
                'progress' => 100.0,
                'completed_at' => date('Y-m-d H:i:s'),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerTransferCompleted(),
                    [
                        'server' => $server,
                        'successful' => true,
                        'destination_node_id' => $destinationNodeId,
                    ]
                );
            }

            $logger->info('Server transfer completed successfully: ' . $server['name'] . ' (UUID: ' . $uuid . ')');

            return ApiResponse::success([], 'Transfer status recorded: success', 200);
        }
        // Transfer failed - revert server status and node_id to source
        $transfer = ServerTransfer::getByServerId($server['id']);
        $sourceNodeId = $transfer ? $transfer['source_node_id'] : $server['node_id'];

        Server::updateServerById($server['id'], [
            'status' => 'offline',
            'node_id' => $sourceNodeId, // Revert to source node
        ]);

        // Update transfer record in database
        ServerTransfer::updateByServerId($server['id'], [
            'status' => 'failed',
            'completed_at' => date('Y-m-d H:i:s'),
            'error' => $error ?? 'Unknown error',
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerTransferFailed(),
                [
                    'server' => $server,
                    'successful' => false,
                    'error' => $error,
                ]
            );
        }

        $logger->error('Server transfer failed: ' . $server['name'] . ' (UUID: ' . $uuid . ')' . ($error ? ' - ' . $error : ''));

        return ApiResponse::success([], 'Transfer status recorded: failed', 200);
    }

    /**
     * Archive transfer - called when destination receives transfer archive.
     *
     * This is an optional endpoint that can track when the destination node
     * begins receiving the transfer archive.
     */
    public function archiveReceived(Request $request, string $uuid): Response
    {
        $server = Server::getServerByUuid($uuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $logger = App::getInstance(true)->getLogger();
        $logger->info('Transfer archive received for server ' . $uuid);

        return ApiResponse::success([], 'Archive receipt acknowledged', 200);
    }

    /**
     * Transfer success - called when transfer completes successfully on destination node.
     *
     * According to Wings spec, this endpoint is called with an empty JSON body.
     * The URL segment (`success`) conveys the state.
     *
     * This method handles:
     * 1. Releasing old allocations (source node) back to the pool
     * 2. Updating server's primary allocation to the new one
     * 3. Updating server's node_id to destination node
     * 4. Deleting backup records (backups are not transferred, files stay on source node)
     * 5. Deleting the server from the old node via Wings API
     * 6. Marking the transfer as successful
     */
    public function transferSuccess(Request $request, string $uuid): Response
    {
        $server = Server::getServerByUuid($uuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $logger = App::getInstance(true)->getLogger();
        $logger->info('Transfer success reported for server ' . $uuid);

        // Get the active transfer record
        $transfer = ServerTransfer::getActiveByServerId($server['id']);
        if (!$transfer) {
            $logger->warning('No active transfer found for server ' . $uuid . ', checking for any transfer');
            $transfer = ServerTransfer::getByServerId($server['id']);
        }

        if (!$transfer) {
            $logger->error('No transfer record found for server ' . $uuid);

            return ApiResponse::error('No transfer record found', 'NO_TRANSFER_RECORD', 404);
        }

        $serverUpdateData = [
            'status' => 'offline',
            'node_id' => $transfer['destination_node_id'],
        ];

        // Handle allocation changes
        // 1. Release old allocations (source node) - they go back to the pool
        if ($transfer['old_allocation'] || !empty($transfer['old_additional_allocations'])) {
            $oldAllocations = [];
            if ($transfer['old_allocation']) {
                $oldAllocations[] = $transfer['old_allocation'];
            }
            if (!empty($transfer['old_additional_allocations'])) {
                $oldAllocations = array_merge($oldAllocations, $transfer['old_additional_allocations']);
            }

            if (!empty($oldAllocations)) {
                $logger->info('Releasing ' . count($oldAllocations) . ' old allocations for server ' . $uuid);
                Allocation::unassignMultiple($oldAllocations);
            }
        }

        // 2. Update server's primary allocation to the new one
        if ($transfer['new_allocation']) {
            $serverUpdateData['allocation_id'] = $transfer['new_allocation'];
            $logger->info('Setting new primary allocation ' . $transfer['new_allocation'] . ' for server ' . $uuid);
        }

        // Update the server
        Server::updateServerById($server['id'], $serverUpdateData);

        // Mark transfer as successful
        ServerTransfer::markSuccessful($server['id']);

        // 3. Delete backups from the old node (they are not transferred)
        $deletedBackups = Backup::deleteAllByServerId($server['id']);
        if ($deletedBackups > 0) {
            $logger->info('Deleted ' . $deletedBackups . ' backup records for transferred server ' . $uuid);
        }

        // 4. Delete the server from the old node via Wings API
        $this->deleteServerFromOldNode($server, $transfer, $logger);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerTransferCompleted(),
                [
                    'server' => $server,
                    'successful' => true,
                    'destination_node_id' => $transfer['destination_node_id'],
                    'old_node_id' => $transfer['source_node_id'],
                ]
            );
        }

        $logger->info('Server transfer completed successfully: ' . $server['name'] . ' (UUID: ' . $uuid . ')');

        return ApiResponse::success([], 'Transfer success recorded', 200);
    }

    /**
     * Transfer failure - called when transfer fails on source or destination node.
     *
     * This endpoint handles failure reports from Wings nodes during transfer.
     *
     * This method handles:
     * 1. Releasing new allocations (destination node) back to the pool
     * 2. Reverting server's node_id to source node
     * 3. Keeping old allocations assigned to the server
     * 4. Marking the transfer as failed
     */
    public function transferFailure(Request $request, string $uuid): Response
    {
        $server = Server::getServerByUuid($uuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        // Allow empty body (Wings may send empty JSON)
        if ($data === null && json_last_error() !== JSON_ERROR_NONE && $request->getContent() !== '') {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        $error = $data['error'] ?? 'Unknown transfer failure';
        $logger = App::getInstance(true)->getLogger();
        $logger->error('Transfer failure reported for server ' . $uuid . ': ' . $error);

        // Get the most recent transfer record
        $transfer = ServerTransfer::getByServerId($server['id']);

        // CRITICAL: Check if the transfer was already marked as successful
        // This can happen due to a race condition where:
        // 1. Destination node completes transfer and reports success
        // 2. Source node receives 202 response and incorrectly reports failure
        // In this case, we should NOT undo the successful transfer
        // Note: successful is stored as TINYINT(1), so compare with 1/0/"1"/"0"
        if ($transfer && ($transfer['successful'] === 1 || $transfer['successful'] === '1' || $transfer['successful'] === true)) {
            $logger->warning('Ignoring transfer failure for server ' . $uuid . ' - transfer was already marked as successful (race condition)');

            return ApiResponse::success([], 'Transfer failure ignored - transfer already completed successfully', 200);
        }

        // Also check if transfer is already marked as failed (duplicate failure report)
        if ($transfer && ($transfer['successful'] === 0 || $transfer['successful'] === '0' || $transfer['successful'] === false)) {
            $logger->warning('Ignoring duplicate transfer failure for server ' . $uuid);

            return ApiResponse::success([], 'Transfer failure already recorded', 200);
        }

        // Check for active transfer
        $activeTransfer = ServerTransfer::getActiveByServerId($server['id']);
        if (!$activeTransfer && !$transfer) {
            $logger->warning('No transfer record found for server ' . $uuid);

            return ApiResponse::error('No transfer record found', 'NO_TRANSFER_RECORD', 404);
        }

        // Use active transfer if available, otherwise use the most recent one
        $transfer = $activeTransfer ?? $transfer;

        $sourceNodeId = $transfer ? $transfer['source_node_id'] : $server['node_id'];
        $oldAllocationId = $transfer ? $transfer['old_allocation'] : $server['allocation_id'];

        // Release new allocations (destination node) - they were temporarily assigned during transfer initiation
        if ($transfer && ($transfer['new_allocation'] || !empty($transfer['new_additional_allocations']))) {
            $newAllocations = [];
            if ($transfer['new_allocation']) {
                $newAllocations[] = $transfer['new_allocation'];
            }
            if (!empty($transfer['new_additional_allocations'])) {
                $newAllocations = array_merge($newAllocations, $transfer['new_additional_allocations']);
            }

            if (!empty($newAllocations)) {
                $logger->info('Releasing ' . count($newAllocations) . ' new allocations for failed transfer of server ' . $uuid);
                Allocation::unassignMultiple($newAllocations);
            }
        }

        // Update server status to offline and revert node_id to source
        // Also revert allocation_id to old allocation
        $serverUpdateData = [
            'status' => 'offline',
            'node_id' => $sourceNodeId,
        ];
        if ($oldAllocationId) {
            $serverUpdateData['allocation_id'] = $oldAllocationId;
        }

        Server::updateServerById($server['id'], $serverUpdateData);

        // Mark transfer as failed
        if ($transfer) {
            ServerTransfer::markFailed($server['id'], $error);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerTransferFailed(),
                [
                    'server' => $server,
                    'successful' => false,
                    'error' => $error,
                    'source_node_id' => $sourceNodeId,
                ]
            );
        }

        $logger->error('Server transfer failed: ' . $server['name'] . ' (UUID: ' . $uuid . ') - ' . $error);

        return ApiResponse::success([], 'Transfer failure recorded', 200);
    }

    /**
     * Delete server from old node after successful transfer.
     *
     * @param array $server The server data
     * @param array $transfer The transfer record
     * @param mixed $logger The logger instance
     */
    private function deleteServerFromOldNode(array $server, array $transfer, $logger): void
    {
        try {
            $oldNode = Node::getNodeById($transfer['source_node_id']);
            if (!$oldNode) {
                $logger->warning('Old node not found for transfer cleanup: ' . $transfer['source_node_id']);

                return;
            }

            $wings = new Wings(
                $oldNode['fqdn'],
                $oldNode['daemonListen'],
                $oldNode['scheme'],
                $oldNode['daemon_token'],
                30
            );

            // Delete the server from the old node
            $wings->getServer()->deleteServer($server['uuid']);
            $logger->info('Successfully deleted server ' . $server['uuid'] . ' from old node ' . $oldNode['name']);
        } catch (\Exception $e) {
            // Log but don't fail - the transfer was still successful
            $logger->warning('Failed to delete server from old node: ' . $e->getMessage());
        }
    }
}
