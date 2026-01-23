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

namespace App\Controllers\User\Server;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Config\ConfigInterface;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use App\SubuserPermissions;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'FastDlConfig',
    type: 'object',
    properties: [
        new OA\Property(property: 'enabled', type: 'boolean', description: 'Whether FastDL is enabled'),
        new OA\Property(property: 'directory', type: 'string', nullable: true, description: 'Subdirectory within server data directory'),
        new OA\Property(property: 'url', type: 'string', nullable: true, description: 'FastDL URL for the server'),
    ]
)]
#[OA\Schema(
    schema: 'FastDlEnableRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'directory', type: 'string', nullable: true, description: 'Optional subdirectory within server data directory (e.g., "csgo")'),
    ]
)]
#[OA\Schema(
    schema: 'FastDlUpdateRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'enabled', type: 'boolean', description: 'Whether FastDL is enabled'),
        new OA\Property(property: 'directory', type: 'string', nullable: true, description: 'Optional subdirectory within server data directory'),
    ]
)]
class ServerFastDlController
{
    use CheckSubuserPermissionsTrait;

    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    /**
     * Get FastDL configuration for a server.
     */
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/fastdl',
        summary: 'Get FastDL configuration',
        description: 'Get FastDL configuration for a server that the user owns or has subuser access to.',
        tags: ['User - Server FastDL'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                required: true,
                description: 'Server short UUID',
                schema: new OA\Schema(type: 'string'),
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'FastDL configuration retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', ref: '#/components/schemas/FastDlConfig'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function getFastDl(Request $request, int $serverId): Response
    {
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check if FastDL is enabled globally
        $fastDlEnabled = $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FASTDL, 'false');
        if ($fastDlEnabled !== 'true') {
            return ApiResponse::error('FastDL management is disabled', 'FASTDL_DISABLED', 403);
        }

        // Check permissions - FastDL read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SETTINGS_REINSTALL);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $wings = $this->createWings($node);

        try {
            $response = $wings->getServer()->getFastDl($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error(
                    'Failed to fetch FastDL configuration: ' . $error,
                    'FASTDL_FETCH_FAILED',
                    $response->getStatusCode()
                );
            }

            /** @var array<string,mixed> $data */
            $data = $response->getData();

            return ApiResponse::success([
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch FastDL configuration: ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch FastDL configuration', 'FASTDL_FETCH_FAILED', 500);
        }
    }

    /**
     * Enable FastDL for a server.
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/fastdl/enable',
        summary: 'Enable FastDL',
        description: 'Enable FastDL for a server that the user owns or has subuser access to.',
        tags: ['User - Server FastDL'],
        requestBody: new OA\RequestBody(required: false, content: new OA\JsonContent(ref: '#/components/schemas/FastDlEnableRequest')),
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                required: true,
                description: 'Server short UUID',
                schema: new OA\Schema(type: 'string'),
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'FastDL enabled successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', ref: '#/components/schemas/FastDlConfig'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function enableFastDl(Request $request, int $serverId): Response
    {
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check if FastDL is enabled globally
        $fastDlEnabled = $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FASTDL, 'false');
        if ($fastDlEnabled !== 'true') {
            return ApiResponse::error('FastDL management is disabled', 'FASTDL_DISABLED', 403);
        }

        // Check permissions - FastDL manage permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SETTINGS_REINSTALL);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $payload = json_decode($request->getContent(), true);
        if ($payload === null) {
            $payload = [];
        }
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_REQUEST_BODY', 400);
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $wings = $this->createWings($node);

        try {
            $data = [];
            if (isset($payload['directory']) && is_string($payload['directory'])) {
                $data['directory'] = trim($payload['directory']);
            }

            $response = $wings->getServer()->enableFastDl($server['uuid'], $data);

            if (!$response->isSuccessful()) {
                $error = $response->getError() ?: 'Unknown error';

                return ApiResponse::error(
                    'Failed to enable FastDL: ' . $error,
                    'FASTDL_ENABLE_FAILED',
                    $response->getStatusCode()
                );
            }

            /** @var array<string,mixed> $responseData */
            $responseData = $response->getData();

            $this->logActivity(
                $server,
                $node,
                'fastdl_enabled',
                [
                    'directory' => $data['directory'] ?? null,
                ],
                $user
            );

            return ApiResponse::success(
                [
                    'data' => $responseData,
                ],
                'FastDL enabled successfully',
                200
            );
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to enable FastDL: ' . $e->getMessage());

            return ApiResponse::error('Failed to enable FastDL', 'FASTDL_ENABLE_FAILED', 500);
        }
    }

    /**
     * Disable FastDL for a server.
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/fastdl/disable',
        summary: 'Disable FastDL',
        description: 'Disable FastDL for a server that the user owns or has subuser access to.',
        tags: ['User - Server FastDL'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                required: true,
                description: 'Server short UUID',
                schema: new OA\Schema(type: 'string'),
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'FastDL disabled successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', ref: '#/components/schemas/FastDlConfig'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function disableFastDl(Request $request, int $serverId): Response
    {
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check if FastDL is enabled globally
        $fastDlEnabled = $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FASTDL, 'false');
        if ($fastDlEnabled !== 'true') {
            return ApiResponse::error('FastDL management is disabled', 'FASTDL_DISABLED', 403);
        }

        // Check permissions - FastDL manage permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SETTINGS_REINSTALL);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $wings = $this->createWings($node);

        try {
            $response = $wings->getServer()->disableFastDl($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError() ?: 'Unknown error';

                return ApiResponse::error(
                    'Failed to disable FastDL: ' . $error,
                    'FASTDL_DISABLE_FAILED',
                    $response->getStatusCode()
                );
            }

            /** @var array<string,mixed> $responseData */
            $responseData = $response->getData();

            $this->logActivity(
                $server,
                $node,
                'fastdl_disabled',
                [],
                $user
            );

            return ApiResponse::success(
                [
                    'data' => $responseData,
                ],
                'FastDL disabled successfully',
                200
            );
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to disable FastDL: ' . $e->getMessage());

            return ApiResponse::error('Failed to disable FastDL', 'FASTDL_DISABLE_FAILED', 500);
        }
    }

    /**
     * Update FastDL configuration for a server.
     */
    #[OA\Put(
        path: '/api/user/servers/{uuidShort}/fastdl',
        summary: 'Update FastDL configuration',
        description: 'Update FastDL configuration for a server that the user owns or has subuser access to.',
        tags: ['User - Server FastDL'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/FastDlUpdateRequest')),
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                required: true,
                description: 'Server short UUID',
                schema: new OA\Schema(type: 'string'),
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'FastDL configuration updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', ref: '#/components/schemas/FastDlConfig'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function updateFastDl(Request $request, int $serverId): Response
    {
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check if FastDL is enabled globally
        $fastDlEnabled = $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FASTDL, 'false');
        if ($fastDlEnabled !== 'true') {
            return ApiResponse::error('FastDL management is disabled', 'FASTDL_DISABLED', 403);
        }

        // Check permissions - FastDL manage permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SETTINGS_REINSTALL);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_REQUEST_BODY', 400);
        }

        if (empty($payload)) {
            return ApiResponse::error('At least one field must be provided', 'INVALID_REQUEST_BODY', 400);
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $wings = $this->createWings($node);

        try {
            $data = [];
            if (isset($payload['enabled'])) {
                $data['enabled'] = (bool) $payload['enabled'];
            }
            if (isset($payload['directory']) && is_string($payload['directory'])) {
                $data['directory'] = trim($payload['directory']);
            } elseif (isset($payload['directory']) && $payload['directory'] === null) {
                $data['directory'] = null;
            }

            $response = $wings->getServer()->updateFastDl($server['uuid'], $data);

            if (!$response->isSuccessful()) {
                $error = $response->getError() ?: 'Unknown error';

                return ApiResponse::error(
                    'Failed to update FastDL configuration: ' . $error,
                    'FASTDL_UPDATE_FAILED',
                    $response->getStatusCode()
                );
            }

            /** @var array<string,mixed> $responseData */
            $responseData = $response->getData();

            $this->logActivity(
                $server,
                $node,
                'fastdl_updated',
                [
                    'enabled' => $data['enabled'] ?? null,
                    'directory' => $data['directory'] ?? null,
                ],
                $user
            );

            return ApiResponse::success(
                [
                    'data' => $responseData,
                ],
                'FastDL configuration updated successfully',
                200
            );
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update FastDL configuration: ' . $e->getMessage());

            return ApiResponse::error('Failed to update FastDL configuration', 'FASTDL_UPDATE_FAILED', 500);
        }
    }

    /**
     * Create a Wings client for a given node.
     */
    private function createWings(array $node): Wings
    {
        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        return new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );
    }

    /**
     * Helper method to log server activity.
     */
    private function logActivity(array $server, array $node, string $event, array $metadata, array $user): void
    {
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => $user['id'],
            'ip' => $user['last_ip'],
            'event' => $event,
            'metadata' => json_encode($metadata),
        ]);
    }
}
