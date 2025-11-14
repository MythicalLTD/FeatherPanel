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

namespace App\Controllers\Wings\Transfer;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\ServerTransfer;
use App\Helpers\ApiResponse;
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
     * Transfer failure - called when transfer fails on source or destination node.
     *
     * This endpoint handles failure reports from Wings nodes during transfer.
     */
    public function transferFailure(Request $request, string $uuid): Response
    {
        $server = Server::getServerByUuid($uuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        $error = $data['error'] ?? 'Unknown transfer failure';
        $logger = App::getInstance(true)->getLogger();
        $logger->error('Transfer failure reported for server ' . $uuid . ': ' . $error);

        // Get transfer record to find source node
        $transfer = ServerTransfer::getByServerId($server['id']);
        $sourceNodeId = $transfer ? $transfer['source_node_id'] : $server['node_id'];

        // Update server status to offline and revert node_id to source
        Server::updateServerById($server['id'], [
            'status' => 'offline',
            'node_id' => $sourceNodeId,
        ]);

        // Update transfer record in database
        ServerTransfer::updateByServerId($server['id'], [
            'status' => 'failed',
            'completed_at' => date('Y-m-d H:i:s'),
            'error' => $error,
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

        return ApiResponse::success([], 'Transfer failure recorded', 200);
    }
}
