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

namespace App\Controllers\User\Server;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\SubuserPermissions;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'FirewallRule',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'server_uuid', type: 'string', format: 'uuid'),
        new OA\Property(property: 'remote_ip', type: 'string'),
        new OA\Property(property: 'server_port', type: 'integer'),
        new OA\Property(property: 'priority', type: 'integer'),
        new OA\Property(property: 'type', type: 'string', enum: ['allow', 'block']),
        new OA\Property(property: 'protocol', type: 'string', enum: ['tcp', 'udp']),
    ]
)]
#[OA\Schema(
    schema: 'FirewallRuleCreateRequest',
    type: 'object',
    required: ['remote_ip', 'server_port', 'type'],
    properties: [
        new OA\Property(property: 'remote_ip', type: 'string', description: 'IP address or CIDR'),
        new OA\Property(property: 'server_port', type: 'integer', description: 'Allocated port (1-65535)'),
        new OA\Property(property: 'priority', type: 'integer', nullable: true, description: 'Rule priority (0-10000)'),
        new OA\Property(property: 'type', type: 'string', enum: ['allow', 'block']),
        new OA\Property(property: 'protocol', type: 'string', enum: ['tcp', 'udp'], nullable: true),
    ]
)]
#[OA\Schema(
    schema: 'FirewallRuleUpdateRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'remote_ip', type: 'string', description: 'IP address or CIDR'),
        new OA\Property(property: 'server_port', type: 'integer', description: 'Allocated port (1-65535)'),
        new OA\Property(property: 'priority', type: 'integer', description: 'Rule priority (0-10000)'),
        new OA\Property(property: 'type', type: 'string', enum: ['allow', 'block']),
        new OA\Property(property: 'protocol', type: 'string', enum: ['tcp', 'udp']),
    ]
)]
class ServerFirewallController
{
    use CheckSubuserPermissionsTrait;

    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    /**
     * List all firewall rules for a server.
     */
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/firewall',
        summary: 'List firewall rules',
        description: 'Get all firewall rules for a server that the user owns or has subuser access to.',
        tags: ['User - Server Firewall'],
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
                description: 'Firewall rules retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/FirewallRule')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Server not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function listRules(Request $request, int $serverId): Response
    {
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check if user-made firewall is enabled
        $firewallEnabled = $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FIREWALL, 'false');
        if ($firewallEnabled !== 'true') {
            return ApiResponse::error('Firewall management is disabled', 'FIREWALL_DISABLED', 403);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FIREWALL_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $wings = $this->createWings($node);

        try {
            $response = $wings->getServer()->getFirewallRules($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error(
                    'Failed to fetch firewall rules: ' . $error,
                    'FIREWALL_FETCH_FAILED',
                    $response->getStatusCode()
                );
            }

            /** @var array<string,mixed> $data */
            $data = $response->getData();

            return ApiResponse::success([
                'data' => $data['data'] ?? [],
            ]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch firewall rules: ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch firewall rules', 'FIREWALL_FETCH_FAILED', 500);
        }
    }

    /**
     * Create a new firewall rule.
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/firewall',
        summary: 'Create firewall rule',
        description: 'Create a new firewall rule for a server that the user owns or has subuser access to.',
        tags: ['User - Server Firewall'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/FirewallRuleCreateRequest')),
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
                response: 201,
                description: 'Firewall rule created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', ref: '#/components/schemas/FirewallRule'),
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
    public function createRule(Request $request, int $serverId): Response
    {
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check if user-made firewall is enabled
        $firewallEnabled = $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FIREWALL, 'false');
        if ($firewallEnabled !== 'true') {
            return ApiResponse::error('Firewall management is disabled', 'FIREWALL_DISABLED', 403);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FIREWALL_MANAGE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_REQUEST_BODY', 400);
        }

        $validationError = $this->validateRulePayload($payload, false);
        if ($validationError !== null) {
            return $validationError;
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $wings = $this->createWings($node);

        try {
            // Sanitize remote_ip before sending to Wings
            $remoteIp = trim($payload['remote_ip']);

            $response = $wings->getServer()->createFirewallRule($server['uuid'], [
                'remote_ip' => $remoteIp,
                'server_port' => (int) $payload['server_port'],
                'priority' => isset($payload['priority']) ? (int) $payload['priority'] : 1,
                'type' => $payload['type'],
                'protocol' => $payload['protocol'] ?? 'tcp',
            ]);

            if (!$response->isSuccessful()) {
                $error = $response->getError() ?: 'Unknown error';

                return ApiResponse::error(
                    'Failed to create firewall rule: ' . $error,
                    'FIREWALL_CREATE_FAILED',
                    $response->getStatusCode()
                );
            }

            /** @var array<string,mixed> $data */
            $data = $response->getData();
            $rule = $data['data'] ?? null;

            $this->logActivity(
                $server,
                $node,
                'firewall_rule_created',
                [
                    'rule_id' => $rule['id'] ?? null,
                    'remote_ip' => $payload['remote_ip'],
                    'server_port' => (int) $payload['server_port'],
                    'type' => $payload['type'],
                    'protocol' => $payload['protocol'] ?? 'tcp',
                ],
                $user
            );

            return ApiResponse::success(
                [
                    'data' => $rule,
                ],
                'Firewall rule created successfully',
                201
            );
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to create firewall rule: ' . $e->getMessage());

            return ApiResponse::error('Failed to create firewall rule', 'FIREWALL_CREATE_FAILED', 500);
        }
    }

    /**
     * Update an existing firewall rule.
     */
    #[OA\Put(
        path: '/api/user/servers/{uuidShort}/firewall/{ruleId}',
        summary: 'Update firewall rule',
        description: 'Update an existing firewall rule for a server that the user owns or has subuser access to.',
        tags: ['User - Server Firewall'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/FirewallRuleUpdateRequest')),
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                required: true,
                description: 'Server short UUID',
                schema: new OA\Schema(type: 'string'),
            ),
            new OA\Parameter(
                name: 'ruleId',
                in: 'path',
                required: true,
                description: 'Firewall rule ID',
                schema: new OA\Schema(type: 'integer'),
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Firewall rule updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', ref: '#/components/schemas/FirewallRule'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Server or rule not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function updateRule(Request $request, int $serverId, int $ruleId): Response
    {
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check if user-made firewall is enabled
        $firewallEnabled = $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FIREWALL, 'false');
        if ($firewallEnabled !== 'true') {
            return ApiResponse::error('Firewall management is disabled', 'FIREWALL_DISABLED', 403);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FIREWALL_MANAGE);
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

        $validationError = $this->validateRulePayload($payload, true);
        if ($validationError !== null) {
            return $validationError;
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $wings = $this->createWings($node);

        try {
            // Sanitize remote_ip if provided
            if (isset($payload['remote_ip'])) {
                $payload['remote_ip'] = trim($payload['remote_ip']);
            }

            $response = $wings->getServer()->updateFirewallRule($server['uuid'], $ruleId, $payload);

            if (!$response->isSuccessful()) {
                $error = $response->getError() ?: 'Unknown error';

                if ($response->getStatusCode() === 404) {
                    return ApiResponse::error('Firewall rule not found', 'FIREWALL_RULE_NOT_FOUND', 404);
                }

                return ApiResponse::error(
                    'Failed to update firewall rule: ' . $error,
                    'FIREWALL_UPDATE_FAILED',
                    $response->getStatusCode()
                );
            }

            /** @var array<string,mixed> $data */
            $data = $response->getData();
            $rule = $data['data'] ?? null;

            $this->logActivity(
                $server,
                $node,
                'firewall_rule_updated',
                [
                    'rule_id' => $ruleId,
                    'remote_ip' => $payload['remote_ip'] ?? null,
                    'server_port' => isset($payload['server_port']) ? (int) $payload['server_port'] : null,
                    'type' => $payload['type'] ?? null,
                    'protocol' => $payload['protocol'] ?? null,
                ],
                $user
            );

            return ApiResponse::success(
                [
                    'data' => $rule,
                ],
                'Firewall rule updated successfully'
            );
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update firewall rule: ' . $e->getMessage());

            return ApiResponse::error('Failed to update firewall rule', 'FIREWALL_UPDATE_FAILED', 500);
        }
    }

    /**
     * Delete a firewall rule.
     */
    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/firewall/{ruleId}',
        summary: 'Delete firewall rule',
        description: 'Delete a firewall rule for a server that the user owns or has subuser access to.',
        tags: ['User - Server Firewall'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                required: true,
                description: 'Server short UUID',
                schema: new OA\Schema(type: 'string'),
            ),
            new OA\Parameter(
                name: 'ruleId',
                in: 'path',
                required: true,
                description: 'Firewall rule ID',
                schema: new OA\Schema(type: 'integer'),
            ),
        ],
        responses: [
            new OA\Response(response: 204, description: 'Firewall rule deleted successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Server or rule not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function deleteRule(Request $request, int $serverId, int $ruleId): Response
    {
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check if user-made firewall is enabled
        $firewallEnabled = $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FIREWALL, 'false');
        if ($firewallEnabled !== 'true') {
            return ApiResponse::error('Firewall management is disabled', 'FIREWALL_DISABLED', 403);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FIREWALL_MANAGE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $wings = $this->createWings($node);

        try {
            $response = $wings->getServer()->deleteFirewallRule($server['uuid'], $ruleId);

            if (!$response->isSuccessful()) {
                $error = $response->getError() ?: 'Unknown error';

                if ($response->getStatusCode() === 404) {
                    return ApiResponse::error('Firewall rule not found', 'FIREWALL_RULE_NOT_FOUND', 404);
                }

                return ApiResponse::error(
                    'Failed to delete firewall rule: ' . $error,
                    'FIREWALL_DELETE_FAILED',
                    $response->getStatusCode()
                );
            }

            $this->logActivity(
                $server,
                $node,
                'firewall_rule_deleted',
                [
                    'rule_id' => $ruleId,
                ],
                $user
            );

            return ApiResponse::success([], 'Firewall rule deleted successfully', 204);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete firewall rule: ' . $e->getMessage());

            return ApiResponse::error('Failed to delete firewall rule', 'FIREWALL_DELETE_FAILED', 500);
        }
    }

    /**
     * Get firewall rules for a specific port.
     */
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/firewall/port/{port}',
        summary: 'Get firewall rules by port',
        description: 'Get all firewall rules for a specific port on a server that the user owns or has subuser access to.',
        tags: ['User - Server Firewall'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                required: true,
                description: 'Server short UUID',
                schema: new OA\Schema(type: 'string'),
            ),
            new OA\Parameter(
                name: 'port',
                in: 'path',
                required: true,
                description: 'Server port',
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 65535),
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Firewall rules for port retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/FirewallRule')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Server not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function getRulesByPort(Request $request, int $serverId, int $port): Response
    {
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        if ($port < 1 || $port > 65535) {
            return ApiResponse::error('Invalid port', 'INVALID_PORT', 400);
        }

        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FIREWALL_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $wings = $this->createWings($node);

        try {
            $response = $wings->getServer()->getFirewallRulesByPort($server['uuid'], $port);

            if (!$response->isSuccessful()) {
                $error = $response->getError() ?: 'Unknown error';

                return ApiResponse::error(
                    'Failed to fetch firewall rules: ' . $error,
                    'FIREWALL_FETCH_FAILED',
                    $response->getStatusCode()
                );
            }

            /** @var array<string,mixed> $data */
            $data = $response->getData();

            return ApiResponse::success([
                'data' => $data['data'] ?? [],
            ]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch firewall rules by port: ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch firewall rules', 'FIREWALL_FETCH_FAILED', 500);
        }
    }

    /**
     * Sync firewall rules for a server.
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/firewall/sync',
        summary: 'Sync firewall rules',
        description: 'Manually sync firewall rules for a server to iptables.',
        tags: ['User - Server Firewall'],
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
                description: 'Firewall rules synced successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string'),
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
    public function syncRules(Request $request, int $serverId): Response
    {
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check if user-made firewall is enabled
        $firewallEnabled = $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FIREWALL, 'false');
        if ($firewallEnabled !== 'true') {
            return ApiResponse::error('Firewall management is disabled', 'FIREWALL_DISABLED', 403);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FIREWALL_MANAGE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $wings = $this->createWings($node);

        try {
            $response = $wings->getServer()->syncFirewallRules($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError() ?: 'Unknown error';

                return ApiResponse::error(
                    'Failed to sync firewall rules: ' . $error,
                    'FIREWALL_SYNC_FAILED',
                    $response->getStatusCode()
                );
            }

            $this->logActivity(
                $server,
                $node,
                'firewall_rules_synced',
                [],
                $user
            );

            return ApiResponse::success([
                'message' => 'Firewall rules synced successfully',
            ]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to sync firewall rules: ' . $e->getMessage());

            return ApiResponse::error('Failed to sync firewall rules', 'FIREWALL_SYNC_FAILED', 500);
        }
    }

    /**
     * Validate firewall rule payload.
     *
     * @param array<string,mixed> $payload
     */
    private function validateRulePayload(array $payload, bool $partial = false): ?Response
    {
        if (!$partial) {
            $required = ['remote_ip', 'server_port', 'type'];
            foreach ($required as $field) {
                if (!isset($payload[$field])) {
                    return ApiResponse::error(
                        'Missing required field: ' . $field,
                        'MISSING_REQUIRED_FIELDS',
                        400
                    );
                }
            }
        }

        if (isset($payload['remote_ip'])) {
            $remoteIp = trim($payload['remote_ip']);

            // Basic type and empty check
            if (!is_string($payload['remote_ip']) || $remoteIp === '') {
                return ApiResponse::error('Invalid remote_ip', 'INVALID_REMOTE_IP', 400);
            }

            // Security: Reject any string containing shell metacharacters or dangerous characters
            // This prevents command injection attacks
            $dangerousChars = [';', '|', '&', '`', '$', '(', ')', '<', '>', "\n", "\r", "\t", "\0"];
            foreach ($dangerousChars as $char) {
                if (strpos($remoteIp, $char) !== false) {
                    App::getInstance(true)->getLogger()->warning('Rejected firewall rule with dangerous characters in remote_ip: ' . substr($remoteIp, 0, 50));

                    return ApiResponse::error('Invalid remote_ip: contains invalid characters', 'INVALID_REMOTE_IP', 400);
                }
            }

            // Validate IP address or CIDR notation
            if (!$this->validateIpOrCidr($remoteIp)) {
                return ApiResponse::error('Invalid remote_ip: must be a valid IP address or CIDR notation (e.g., 192.168.1.100 or 10.0.0.0/24)', 'INVALID_REMOTE_IP', 400);
            }
        }

        if (isset($payload['server_port'])) {
            if (!is_numeric($payload['server_port'])) {
                return ApiResponse::error('Invalid server_port', 'INVALID_PORT', 400);
            }
            $port = (int) $payload['server_port'];
            if ($port < 1 || $port > 65535) {
                return ApiResponse::error('Invalid server_port', 'INVALID_PORT', 400);
            }
        }

        if (isset($payload['priority'])) {
            if (!is_numeric($payload['priority'])) {
                return ApiResponse::error('Invalid priority', 'INVALID_PRIORITY', 400);
            }
            $priority = (int) $payload['priority'];
            if ($priority < 0 || $priority > 10000) {
                return ApiResponse::error('Invalid priority', 'INVALID_PRIORITY', 400);
            }
        }

        if (isset($payload['type']) && !in_array($payload['type'], ['allow', 'block'], true)) {
            return ApiResponse::error('Invalid type', 'INVALID_TYPE', 400);
        }

        if (isset($payload['protocol']) && !in_array($payload['protocol'], ['tcp', 'udp'], true)) {
            return ApiResponse::error('Invalid protocol', 'INVALID_PROTOCOL', 400);
        }

        return null;
    }

    /**
     * Validate IP address or CIDR notation.
     *
     * @param string $ipOrCidr IP address or CIDR notation (e.g., "192.168.1.100" or "10.0.0.0/24")
     *
     * @return bool True if valid, false otherwise
     */
    private function validateIpOrCidr(string $ipOrCidr): bool
    {
        // Check for CIDR notation
        if (strpos($ipOrCidr, '/') !== false) {
            [$ip, $prefixLength] = explode('/', $ipOrCidr, 2);

            // Validate prefix length
            if (!is_numeric($prefixLength)) {
                return false;
            }

            $prefixLength = (int) $prefixLength;

            // Validate IP part
            $isIpv4 = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false;
            $isIpv6 = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;

            if (!$isIpv4 && !$isIpv6) {
                return false;
            }

            // Validate prefix length ranges
            if ($isIpv4) {
                // IPv4: prefix length must be between 0 and 32
                if ($prefixLength < 0 || $prefixLength > 32) {
                    return false;
                }
            } else {
                // IPv6: prefix length must be between 0 and 128
                if ($prefixLength < 0 || $prefixLength > 128) {
                    return false;
                }
            }

            return true;
        }

        // Validate as plain IP address (IPv4 or IPv6)
        return filter_var($ipOrCidr, FILTER_VALIDATE_IP) !== false;
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
