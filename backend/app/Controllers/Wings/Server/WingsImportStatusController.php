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

namespace App\Controllers\Wings\Server;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Chat\ServerImport as ServerImportModel;

/**
 * Controller for handling import status callbacks from Wings.
 *
 * Wings calls this endpoint to report the final status of an import operation.
 * This is called via SetImportStatus(ctx, uuid, successful) from Wings.
 */
#[OA\Post(
    path: '/api/remote/servers/{uuid}/import',
    summary: 'Report import status',
    description: 'Called by Wings to report the final status of a server import operation.',
    tags: ['Wings - Remote API'],
    parameters: [
        new OA\Parameter(
            name: 'uuid',
            in: 'path',
            required: true,
            description: 'Server UUID',
            schema: new OA\Schema(type: 'string'),
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'successful', type: 'boolean', description: 'Whether the import completed successfully'),
                new OA\Property(property: 'error', type: 'string', description: 'Error message if import failed', nullable: true),
            ],
            required: ['successful']
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Import status recorded successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                ]
            )
        ),
        new OA\Response(response: 400, description: 'Bad request'),
        new OA\Response(response: 403, description: 'Invalid Wings authentication'),
        new OA\Response(response: 404, description: 'Server not found'),
    ]
)]
class WingsImportStatusController
{
    /**
     * Report import status from Wings.
     *
     * This endpoint receives callbacks from Wings nodes to report import outcomes.
     * Called via SetImportStatus(ctx, uuid, successful) from Wings.
     *
     * Expected payload (POST):
     * {
     *   "successful": true/false,
     *   "error": "error message if failed" (optional)
     * }
     */
    public function setImportStatus(Request $request, string $uuid): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        // Validate required fields
        if (!isset($data['successful'])) {
            return ApiResponse::error('Missing required field: successful', 'MISSING_FIELD', 400);
        }

        // Validate error field if present
        if (isset($data['error']) && !is_string($data['error'])) {
            return ApiResponse::error('Error field must be a string', 'INVALID_ERROR_FIELD', 400);
        }

        $successful = (bool) $data['successful'];
        $error = isset($data['error']) && is_string($data['error']) ? trim($data['error']) : null;

        // Limit error message length (sanitization)
        if ($error && strlen($error) > 1000) {
            $error = substr($error, 0, 1000);
        }

        // Get Wings authentication attributes from request
        $tokenId = $request->attributes->get('wings_token_id');
        $tokenSecret = $request->attributes->get('wings_token_secret');

        if (!$tokenId || !$tokenSecret) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get node info
        $node = Node::getNodeByWingsAuth($tokenId, $tokenSecret);

        if (!$node) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Find server by UUID and verify it belongs to this node
        $server = Server::getServerByUuidAndNodeId($uuid, (int) $node['id']);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Log the import status
        $logger = App::getInstance(true)->getLogger();
        $logger->info('Import status received for server ' . $uuid . ': ' . ($successful ? 'success' : 'failed') . ($error ? ' - ' . $error : ''));

        // Update import record in database
        // Find the most recent import in 'importing' or 'pending' status
        $import = ServerImportModel::getLatestActiveByServerId($server['id']);

        if (!$import) {
            // Fallback: Wings sent status but no active import found
            // This shouldn't happen, but handle gracefully
            $logger->warning('Import status update received but no active import found for server ' . $uuid . ' (successful: ' . ($successful ? 'true' : 'false') . ')');

            // Return success to Wings (idempotency - safe to retry)
            return ApiResponse::success(['success' => true], 'Import status received (no active import found)', 200);
        }

        // Check if already processed (idempotency)
        if ($import['status'] === 'completed' || $import['status'] === 'failed') {
            $logger->info('Import status update received but import already processed for server ' . $uuid . ' (import_id: ' . $import['id'] . ', status: ' . $import['status'] . ')');

            // Return success to Wings (idempotency - safe to retry)
            return ApiResponse::success(['success' => true], 'Import status already processed', 200);
        }

        // Update the import status
        ServerImportModel::update($import['id'], [
            'status' => $successful ? 'completed' : 'failed',
            'error' => $successful ? null : $error,
            'completed_at' => date('Y-m-d H:i:s'),
        ]);

        // Log server activity
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => null, // Wings callback, no user
            'ip' => null,
            'event' => $successful ? 'server_import_completed' : 'server_import_failed',
            'metadata' => json_encode([
                'successful' => $successful,
                'error' => $error,
                'import_id' => $import['id'] ?? null,
            ]),
        ]);

        // Emit event for plugins (if needed)
        global $eventManager;
        if (isset($eventManager)) {
            $eventManager->emit('featherpanel:wings:server:import:status', [
                'server_uuid' => $uuid,
                'server' => $server,
                'node' => $node,
                'successful' => $successful,
                'error' => $error,
            ]);
        }

        // Return 200 OK with success response (as per guide)
        return ApiResponse::success(['success' => true], 'Import status recorded successfully', 200);
    }

    /**
     * Handle GET requests from Wings.
     * Wings may send GET requests to check endpoint existence.
     * If Wings sends status data via GET (query params or body), process it.
     * Otherwise, if Wings makes GET requests after import completion (workaround for Wings bug),
     * mark the latest active import as completed.
     */
    public function handleGetRequest(Request $request, string $uuid): Response
    {
        $logger = App::getInstance(true)->getLogger();

        // Get Wings authentication attributes from request
        $tokenId = $request->attributes->get('wings_token_id');
        $tokenSecret = $request->attributes->get('wings_token_secret');

        if (!$tokenId || !$tokenSecret) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get node info
        $node = Node::getNodeByWingsAuth($tokenId, $tokenSecret);
        if (!$node) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Find server by UUID and verify it belongs to this node
        $server = Server::getServerByUuidAndNodeId($uuid, (int) $node['id']);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check if status is provided via query parameters or body
        $successful = $request->query->get('successful');
        $error = $request->query->get('error');

        // If not in query params, check request body
        if ($successful === null && $request->getContent()) {
            $bodyData = json_decode($request->getContent(), true);
            if (is_array($bodyData) && isset($bodyData['successful'])) {
                $successful = $bodyData['successful'];
                $error = $bodyData['error'] ?? null;
            }
        }

        // If status is provided via GET, process it (workaround for Wings sending GET instead of POST)
        if ($successful !== null) {
            $logger->info('Import status received via GET for server ' . $uuid . ': ' . ($successful ? 'success' : 'failed'));

            // Process the status update (reuse the same logic as POST)
            $import = ServerImportModel::getLatestActiveByServerId($server['id']);

            if (!$import) {
                $logger->warning('Import status GET received but no active import found for server ' . $uuid . ' (successful: ' . ($successful ? 'true' : 'false') . ')');

                return ApiResponse::success(['success' => true], 'Import status received (no active import found)', 200);
            }

            // Check if already processed (idempotency)
            if ($import['status'] === 'completed' || $import['status'] === 'failed') {
                return ApiResponse::success(['success' => true], 'Import status already processed', 200);
            }

            // Update the import status
            ServerImportModel::update($import['id'], [
                'status' => filter_var($successful, FILTER_VALIDATE_BOOLEAN) ? 'completed' : 'failed',
                'error' => filter_var($successful, FILTER_VALIDATE_BOOLEAN) ? null : ($error ? trim(substr($error, 0, 1000)) : null),
                'completed_at' => date('Y-m-d H:i:s'),
            ]);

            // Log server activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => null,
                'ip' => null,
                'event' => filter_var($successful, FILTER_VALIDATE_BOOLEAN) ? 'server_import_completed' : 'server_import_failed',
                'metadata' => json_encode([
                    'successful' => filter_var($successful, FILTER_VALIDATE_BOOLEAN),
                    'error' => $error,
                    'import_id' => $import['id'],
                ]),
            ]);

            return ApiResponse::success(['success' => true], 'Import status recorded', 200);
        }

        // Wings is making GET requests but not sending status data
        // Workaround: Since Wings logs show "was_successful=true", mark the latest active import as completed
        $logger->warning('Import status GET request for server ' . $uuid . ' but no status data provided. Marking latest import as completed (workaround).');

        $import = ServerImportModel::getLatestActiveByServerId($server['id']);
        if ($import && ($import['status'] === 'pending' || $import['status'] === 'importing')) {
            $logger->info('Updating import ' . $import['id'] . ' to completed (Wings GET callback workaround)');
            ServerImportModel::update($import['id'], [
                'status' => 'completed',
                'completed_at' => date('Y-m-d H:i:s'),
            ]);

            // Log server activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => null,
                'ip' => null,
                'event' => 'server_import_completed',
                'metadata' => json_encode([
                    'successful' => true,
                    'import_id' => $import['id'],
                ]),
            ]);
        }

        return ApiResponse::success(['endpoint' => 'import_status'], 'Import status endpoint available', 200);
    }
}
