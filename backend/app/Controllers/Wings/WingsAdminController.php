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

namespace App\Controllers\Wings;

use App\Chat\Node;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Plugins\Events\Events\WingsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'WingsAdminResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Welcome message'),
    ]
)]
#[OA\Schema(
    schema: 'NodeUtilization',
    type: 'object',
    properties: [
        new OA\Property(property: 'node', type: 'object', description: 'Node information'),
        new OA\Property(property: 'utilization', type: 'object', description: 'System utilization data'),
    ]
)]
#[OA\Schema(
    schema: 'NodeDockerDiskUsage',
    type: 'object',
    properties: [
        new OA\Property(property: 'node', type: 'object', description: 'Node information'),
        new OA\Property(property: 'dockerDiskUsage', type: 'object', description: 'Docker disk usage data'),
    ]
)]
#[OA\Schema(
    schema: 'NodeDockerPrune',
    type: 'object',
    properties: [
        new OA\Property(property: 'node', type: 'object', description: 'Node information'),
        new OA\Property(property: 'dockerPrune', type: 'object', description: 'Docker prune results'),
    ]
)]
#[OA\Schema(
    schema: 'NodeIps',
    type: 'object',
    properties: [
        new OA\Property(property: 'node', type: 'object', description: 'Node information'),
        new OA\Property(property: 'ips', type: 'array', items: new OA\Items(type: 'string'), description: 'Available IP addresses'),
    ]
)]
#[OA\Schema(
    schema: 'NodeSystemInfo',
    type: 'object',
    properties: [
        new OA\Property(property: 'node', type: 'object', description: 'Node information'),
        new OA\Property(property: 'wings', type: 'object', description: 'Detailed system information from Wings'),
    ]
)]
class WingsAdminController
{
    #[OA\Get(
        path: '/api/wings/admin',
        summary: 'Wings admin index',
        description: 'Welcome endpoint for Wings admin functionality. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Admin'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Welcome message',
                content: new OA\JsonContent(ref: '#/components/schemas/WingsAdminResponse')
            ),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function index(Request $request): Response
    {
        return ApiResponse::success(null, 'Welcome to the Wings Admin route!');
    }

    #[OA\Get(
        path: '/api/wings/admin/node/{id}/utilization',
        summary: 'Get node utilization',
        description: 'Retrieve system utilization data for a specific node from Wings daemon. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Admin'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Node utilization retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/NodeUtilization')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid node ID'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Not found - Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Wings connection failed'),
        ]
    )]
    public function utilization(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        if (APP_DEBUG) {
            $wings->testConnection();
        } else {
            try {
                if (!$wings->testConnection()) {
                    return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
                }
            } catch (\Exception $e) {
                return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
            }
        }

        $utilization = $wings->getSystem()->getSystemUtilization();

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsNodeUtilizationRetrieved(),
            [
                'node_id' => $id,
                'node' => $node,
                'utilization' => $utilization,
            ]
        );

        return ApiResponse::success(['node' => $node, 'utilization' => $utilization], 'Node utilization', 200);
    }

    #[OA\Get(
        path: '/api/wings/admin/node/{id}/docker/disk',
        summary: 'Get Docker disk usage',
        description: 'Retrieve Docker disk usage information for a specific node from Wings daemon. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Admin'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Docker disk usage retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/NodeDockerDiskUsage')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid node ID'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Not found - Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Wings connection failed'),
        ]
    )]
    public function getDockerDiskUsage(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        $dockerDiskUsage = $wings->getDocker()->getDockerDiskUsage();

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsDockerDiskUsageRetrieved(),
            [
                'node_id' => $id,
                'node' => $node,
                'docker_disk_usage' => $dockerDiskUsage,
            ]
        );

        return ApiResponse::success(['node' => $node, 'dockerDiskUsage' => $dockerDiskUsage], 'Node docker disk usage', 200);
    }

    #[OA\Delete(
        path: '/api/wings/admin/node/{id}/docker/prune',
        summary: 'Prune Docker images',
        description: 'Execute Docker image pruning on a specific node to free up disk space. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Admin'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Docker prune completed successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/NodeDockerPrune')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid node ID'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Not found - Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Wings connection failed'),
        ]
    )]
    public function getDockerPrune(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        $dockerPrune = $wings->getDocker()->pruneDockerImages();

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsDockerPruneCompleted(),
            [
                'node_id' => $id,
                'node' => $node,
                'docker_prune' => $dockerPrune,
            ]
        );

        return ApiResponse::success(['node' => $node, 'dockerPrune' => $dockerPrune], 'Node docker prune', 200);
    }

    #[OA\Get(
        path: '/api/wings/admin/node/{id}/ips',
        summary: 'Get node IPs',
        description: 'Retrieve available IP addresses for a specific node from Wings daemon. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Admin'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Node IPs retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/NodeIps')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid node ID'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Not found - Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Wings connection failed'),
        ]
    )]
    public function getIps(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        if (APP_DEBUG) {
            $wings->testConnection();
        } else {
            try {
                if (!$wings->testConnection()) {
                    return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
                }
            } catch (\Exception $e) {
                return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
            }
        }

        $ips = $wings->getSystem()->getSystemIPs();

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsNodeIpsRetrieved(),
            [
                'node_id' => $id,
                'node' => $node,
                'ips' => $ips,
            ]
        );

        return ApiResponse::success(['node' => $node, 'ips' => $ips], 'Node IPs', 200);
    }

    /**
     * Get node network information (alias for getIps with different response format).
     */
    public function getNetwork(Request $request, int $id): Response
    {
        $response = $this->getIps($request, $id);

        // Transform response to match frontend expected format
        if ($response->getStatusCode() === 200) {
            $data = json_decode($response->getContent(), true);
            if (isset($data['data']['ips'])) {
                // Return just the ips structure expected by frontend
                return ApiResponse::success(['ips' => $data['data']['ips']], 'Network information retrieved successfully', 200);
            }
        }

        return $response;
    }

    #[OA\Get(
        path: '/api/wings/admin/node/{id}/system',
        summary: 'Get node system information',
        description: 'Retrieve detailed system information for a specific node from Wings daemon. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Admin'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Node system information retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/NodeSystemInfo')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid node ID'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Not found - Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Wings connection failed'),
        ]
    )]
    public function system(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        if (APP_DEBUG) {
            $wings->testConnection();
        } else {
            try {
                if (!$wings->testConnection()) {
                    return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
                }
            } catch (\Exception $e) {
                return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
            }
        }

        $system = $wings->getSystem()->getDetailedSystemInfo();

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsNodeSystemInfoRetrieved(),
            [
                'node_id' => $id,
                'node' => $node,
                'system_info' => $system,
            ]
        );

        return ApiResponse::success(['node' => $node, 'wings' => $system], 'Node system information', 200);
    }

    #[OA\Get(
        path: '/api/wings/admin/node/{id}/modules',
        summary: 'List all modules',
        description: 'Retrieve a list of all registered modules and their current status. Requires Wings node token authentication.',
        tags: ['Wings - Admin'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Modules listed successfully',
                content: new OA\JsonContent(type: 'object', properties: [
                    new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                ])
            ),
        ]
    )]
    public function listModules(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        if (APP_DEBUG) {
            $wings->testConnection();
        } else {
            try {
                if (!$wings->testConnection()) {
                    return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
                }
            } catch (\Exception $e) {
                return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
            }
        }

        $modules = $wings->getModule()->listModules();

        return ApiResponse::success($modules, 'Modules retrieved successfully', 200);
    }

    #[OA\Get(
        path: '/api/wings/admin/node/{id}/modules/{module}/config',
        summary: 'Get module configuration',
        description: 'Retrieve the current configuration for a specific module. Requires Wings node token authentication.',
        tags: ['Wings - Admin'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'module',
                in: 'path',
                description: 'Module name',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Module configuration retrieved successfully',
                content: new OA\JsonContent(type: 'object')
            ),
        ]
    )]
    public function getModuleConfig(Request $request, int $id, string $module): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        if (APP_DEBUG) {
            $wings->testConnection();
        } else {
            try {
                if (!$wings->testConnection()) {
                    return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
                }
            } catch (\Exception $e) {
                return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
            }
        }

        $config = $wings->getModule()->getModuleConfig($module);

        return ApiResponse::success($config, 'Module configuration retrieved successfully', 200);
    }

    #[OA\Put(
        path: '/api/wings/admin/node/{id}/modules/{module}/config',
        summary: 'Update module configuration',
        description: 'Update the configuration for a specific module. The module must be disabled before configuration changes can be applied. Requires Wings node token authentication.',
        tags: ['Wings - Admin'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'module',
                in: 'path',
                description: 'Module name',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Module configuration updated successfully',
                content: new OA\JsonContent(type: 'object')
            ),
        ]
    )]
    public function updateModuleConfig(Request $request, int $id, string $module): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $requestData = json_decode($request->getContent(), true);
        if (!isset($requestData['config'])) {
            return ApiResponse::error('Missing config in request body', 'INVALID_REQUEST', 400);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        if (APP_DEBUG) {
            $wings->testConnection();
        } else {
            try {
                if (!$wings->testConnection()) {
                    return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
                }
            } catch (\Exception $e) {
                return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
            }
        }

        $config = $wings->getModule()->updateModuleConfig($module, $requestData['config']);

        return ApiResponse::success($config, 'Module configuration updated successfully', 200);
    }

    #[OA\Post(
        path: '/api/wings/admin/node/{id}/modules/{module}/enable',
        summary: 'Enable module',
        description: 'Enable a module. This will start the module and make it active. Requires Wings node token authentication.',
        tags: ['Wings - Admin'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'module',
                in: 'path',
                description: 'Module name',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Module enabled successfully',
                content: new OA\JsonContent(type: 'object')
            ),
        ]
    )]
    public function enableModule(Request $request, int $id, string $module): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        if (APP_DEBUG) {
            $wings->testConnection();
        } else {
            try {
                if (!$wings->testConnection()) {
                    return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
                }
            } catch (\Exception $e) {
                return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
            }
        }

        $result = $wings->getModule()->enableModule($module);

        return ApiResponse::success($result, 'Module enabled successfully', 200);
    }

    #[OA\Post(
        path: '/api/wings/admin/node/{id}/modules/{module}/disable',
        summary: 'Disable module',
        description: 'Disable a module. This will stop the module and make it inactive. Requires Wings node token authentication.',
        tags: ['Wings - Admin'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'module',
                in: 'path',
                description: 'Module name',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Module disabled successfully',
                content: new OA\JsonContent(type: 'object')
            ),
        ]
    )]
    public function disableModule(Request $request, int $id, string $module): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        if (APP_DEBUG) {
            $wings->testConnection();
        } else {
            try {
                if (!$wings->testConnection()) {
                    return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
                }
            } catch (\Exception $e) {
                return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
            }
        }

        $result = $wings->getModule()->disableModule($module);

        return ApiResponse::success($result, 'Module disabled successfully', 200);
    }
}
