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

namespace App\Controllers\Wings\Server;

use App\Chat\Node;
use App\Chat\Spell;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Plugins\Events\Events\WingsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'ServerInstallConfig',
    type: 'object',
    properties: [
        new OA\Property(property: 'container_image', type: 'string', description: 'Docker container image'),
        new OA\Property(property: 'entrypoint', type: 'string', description: 'Container entrypoint'),
        new OA\Property(property: 'script', type: 'string', description: 'Installation script'),
    ]
)]
#[OA\Schema(
    schema: 'ServerInstallCompletion',
    type: 'object',
    required: ['successful'],
    properties: [
        new OA\Property(property: 'successful', type: 'boolean', description: 'Whether installation was successful'),
        new OA\Property(property: 'reinstall', type: 'boolean', description: 'Whether this was a reinstall'),
    ]
)]
class WingsServerInstallController
{
    #[OA\Get(
        path: '/api/remote/servers/{uuid}/install',
        summary: 'Get server installation configuration',
        description: 'Retrieve server installation configuration including container image, entrypoint, and installation script. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Server'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Server UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server installation configuration retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ServerInstallConfig')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing server UUID'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid Wings authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Invalid Wings authentication'),
            new OA\Response(response: 404, description: 'Not found - Server, node, or spell not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function getServerInstall(Request $request, string $uuid): Response
    {
        // Get server by UUID
        $server = Server::getServerByUuid($uuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
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

        // Get server info
        $server = Server::getServerByUuidAndNodeId($uuid, (int) $node['id']);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get spell information
        $spell = Spell::getSpellById($server['spell_id']);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }

        // Get docker image from spell or server
        $containerImage = $server['image']; // Use server.image as fallback
        if (!empty($spell['copy_script_container'])) {
            $containerImage = $spell['copy_script_container'];
        } elseif (!empty($spell['script_container'])) {
            $containerImage = $spell['script_container'];
        } elseif (!empty($spell['docker_images'])) {
            try {
                $dockerImages = json_decode($spell['docker_images'], true);
                if (is_array($dockerImages) && !empty($dockerImages)) {
                    // Use the first available image from spell or fallback to server image
                    $containerImage = $dockerImages[0] ?? $server['image'];
                }
            } catch (\Exception $e) {
                // If docker images parsing fails, use server image
            }
        }

        // Get installation script from spell
        $script = '';
        if (!empty($spell['copy_script_install'])) {
            $script = $spell['copy_script_install'];
        } elseif (!empty($spell['script_install'])) {
            $script = $spell['script_install'];
        }

        // Get entrypoint from spell or use default
        $entrypoint = '/bin/bash';
        if (!empty($spell['copy_script_entry'])) {
            $entrypoint = $spell['copy_script_entry'];
        } elseif (!empty($spell['script_entry'])) {
            $entrypoint = $spell['script_entry'];
        }

        // Build the installation configuration
        $installConfig = [
            'container_image' => $containerImage,
            'entrypoint' => $entrypoint,
            'script' => $script,
        ];

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsServerInstallRetrieved(),
            [
                'server_uuid' => $uuid,
                'server' => $server,
                'node' => $node,
                'spell' => $spell,
                'install_config' => $installConfig,
            ]
        );

        return ApiResponse::sendManualResponse($installConfig, 200);
    }

    #[OA\Post(
        path: '/api/remote/servers/{uuid}/install',
        summary: 'Report server installation completion',
        description: 'Report server installation completion status to update server installation state. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Server'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Server UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ServerInstallCompletion')
        ),
        responses: [
            new OA\Response(
                response: 204,
                description: 'Installation completion reported successfully'
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing server UUID, invalid JSON, or missing required field'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid Wings authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Invalid Wings authentication'),
            new OA\Response(response: 404, description: 'Not found - Server, node, or spell not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update installation status'),
        ]
    )]
    public function postServerInstall(Request $request, string $uuid): Response
    {
        // Get server by UUID
        $server = Server::getServerByUuid($uuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
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

        // Get server info
        $server = Server::getServerByUuidAndNodeId($uuid, (int) $node['id']);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get request content
        $content = json_decode($request->getContent(), true);

        if (!$content) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        // Validate required fields
        if (!isset($content['successful'])) {
            return ApiResponse::error('Missing required field: successful', 'MISSING_FIELD', 400);
        }

        $successful = (bool) $content['successful'];
        $reinstall = (bool) ($content['reinstall'] ?? false);

        // Update server installation status
        try {
            $status = 'installed'; // Default to installed for successful installations
            $installedAt = new \DateTimeImmutable();

            // Make sure the type of failure is accurate
            if (!$successful) {
                $status = 'installation_failed';

                if ($reinstall) {
                    $status = 'reinstall_failed';
                }
            }

            // Keep the server suspended if it's already suspended
            if ($server['status'] === 'suspended') {
                $status = 'suspended';
            }

            // Update server status and installed_at timestamp
            Server::updateServerInstallationStatus($server['id'], $status, $installedAt);

            // Emit event
            global $eventManager;
            $eventManager->emit(
                WingsEvent::onWingsServerInstallCompleted(),
                [
                    'server_uuid' => $uuid,
                    'server' => $server,
                    'node' => $node,
                    'successful' => $successful,
                    'reinstall' => $reinstall,
                    'status' => $status,
                    'installed_at' => $installedAt->format('Y-m-d H:i:s'),
                ]
            );

            return ApiResponse::sendManualResponse([], 204);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to update installation status', 'UPDATE_FAILED', 500);
        }
    }
}
