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

namespace App\Controllers\User\Vds;


use App\App;
use App\Chat\User;
use App\Chat\VmNode;
use App\Chat\Activity;
use App\Permissions;
use App\Chat\VmInstance;
use App\Chat\VmSubuser;
use App\Helpers\VmGateway;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Services\Proxmox\Proxmox;
use App\Helpers\PermissionHelper;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * VmUserInstanceController - User-facing VM instance operations.
 * Similar to ServerUserController but for VDS/VM instances.
 */
class VmUserInstanceController
{
    #[OA\Get(
        path: '/api/user/vm-instances',
        summary: 'Get user VM instances',
        description: 'Get all VM instances owned by or accessible to the authenticated user.',
        tags: ['User - VM Instances'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM instances retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'instances', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function getUserVmInstances(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $userUuid = $user['uuid'];
        $userId = (int) $user['id'];

        // Get instances owned by user
        $ownedInstances = $this->getVmInstancesByUserUuid($userUuid);

        // Get instances where user is a subuser
        $subuserInstanceIds = VmSubuser::getVmInstancesByUser($userId);
        $subuserInstances = [];
        foreach ($subuserInstanceIds as $instanceId) {
            $instance = VmInstance::getById($instanceId);
            if ($instance) {
                $instance['is_subuser'] = true;
                $subuserInstances[] = $instance;
            }
        }

        // Merge and deduplicate
        $allInstances = array_merge($ownedInstances, $subuserInstances);
        $uniqueInstances = [];
        $seenIds = [];
        
        foreach ($allInstances as $instance) {
            if (!in_array($instance['id'], $seenIds, true)) {
                $seenIds[] = $instance['id'];
                $uniqueInstances[] = $instance;
            }
        }

        return ApiResponse::success([
            'instances' => $uniqueInstances,
        ], 'VM instances retrieved successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}',
        summary: 'Get VM instance details',
        description: 'Get detailed information about a specific VM instance.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM instance retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'instance', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
        ]
    )]
    public function getVmInstance(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        // Add subuser flag if applicable
        $vmInstance['is_owner'] = isset($vmInstance['user_uuid']) && $vmInstance['user_uuid'] === $user['uuid'];
        $vmInstance['is_subuser'] = !$vmInstance['is_owner'];

        return ApiResponse::success([
            'instance' => $vmInstance,
        ], 'VM instance retrieved successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/status',
        summary: 'Get VM instance status',
        description: 'Get current status and resource usage from Proxmox.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Status retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Proxmox error'),
        ]
    )]
    public function getVmInstanceStatus(Request $request, int $id): Response
    {
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $vmNode = VmNode::getVmNodeById((int) $vmInstance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        try {
            $client = $this->buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $node = $vmInstance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $vmInstance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }

        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }

        $vmType = ($vmInstance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $result = $client->getVmStatusCurrent($node, (int) $vmInstance['vmid'], $vmType);

        if (!$result['ok']) {
            return ApiResponse::error('Failed to fetch status: ' . ($result['error'] ?? ''), 'PROXMOX_ERROR', 502);
        }

        return ApiResponse::success(['status' => $result['status'] ?? []], 'Status fetched', 200);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/power',
        summary: 'VM power action',
        description: 'Perform power action: start, stop, or reboot.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'action', type: 'string', enum: ['start', 'stop', 'reboot']),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Power action completed',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'instance', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Power action failed'),
        ]
    )]
    public function powerAction(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        // Check permission
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'power')) {
            return ApiResponse::error('You do not have permission to control power for this VM', 'PERMISSION_DENIED', 403);
        }

        $data = json_decode($request->getContent(), true);
        $action = $data['action'] ?? null;

        if (!in_array($action, ['start', 'stop', 'reboot'], true)) {
            return ApiResponse::error('Invalid action. Use start, stop, or reboot.', 'INVALID_ACTION', 400);
        }

        $vmNode = VmNode::getVmNodeById((int) $vmInstance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        try {
            $client = $this->buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $node = $vmInstance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $vmInstance['vmid']);
            if (!$find['ok']) {
                return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
            }
            $node = $find['node'];
        }

        $vmid = (int) $vmInstance['vmid'];
        $vmType = in_array($vmInstance['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true) ? $vmInstance['vm_type'] : 'qemu';

        if ($action === 'start') {
            $result = $client->startVm($node, $vmid, $vmType);
            if ($result['ok']) {
                VmInstance::updateStatus($id, 'running');
            } else {
                return ApiResponse::error('Start failed: ' . ($result['error'] ?? 'unknown'), 'POWER_FAILED', 500);
            }
        } elseif ($action === 'stop') {
            $result = $client->stopVm($node, $vmid, $vmType);
            if ($result['ok']) {
                VmInstance::updateStatus($id, 'stopped');
            } else {
                return ApiResponse::error('Stop failed: ' . ($result['error'] ?? 'unknown'), 'POWER_FAILED', 500);
            }
        } else {
            $result = $client->stopVm($node, $vmid, $vmType);
            if (!$result['ok']) {
                return ApiResponse::error('Reboot (stop) failed: ' . ($result['error'] ?? 'unknown'), 'POWER_FAILED', 500);
            }
            sleep(3);
            $result = $client->startVm($node, $vmid, $vmType);
            if (!$result['ok']) {
                VmInstance::updateStatus($id, 'stopped');
                return ApiResponse::error('Reboot (start) failed: ' . ($result['error'] ?? 'unknown'), 'POWER_FAILED', 500);
            }
            VmInstance::updateStatus($id, 'running');
        }

        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'vm_instance_power_' . $action,
            'context' => 'Power action ' . $action . ' on VM: ' . ($vmInstance['hostname'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        $instance = VmInstance::getById($id);
        return ApiResponse::success(['instance' => $instance], 'Power action completed', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/vnc-ticket',
        summary: 'Get VNC console ticket',
        description: 'Get VNC console access ticket for the VM.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VNC ticket created',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'ticket', type: 'string'),
                        new OA\Property(property: 'port', type: 'integer'),
                        new OA\Property(property: 'wss_url', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'VNC proxy failed'),
        ]
    )]
    public function getVncTicket(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        // Check permission
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'console')) {
            return ApiResponse::error('You do not have permission to access console for this VM', 'PERMISSION_DENIED', 403);
        }

        $vmType = ($vmInstance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $vmNode = VmNode::getVmNodeById((int) $vmInstance['vm_node_id']);
        
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        try {
            $client = $this->buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $node = $vmInstance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $vmInstance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }

        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }

        $vnc = $client->createVncProxy($node, (int) $vmInstance['vmid'], $vmType);
        
        if (!$vnc['ok'] || $vnc['ticket'] === null || $vnc['port'] === null) {
            return ApiResponse::error('VNC proxy failed: ' . ($vnc['error'] ?? 'unknown'), 'VNC_PROXY_FAILED', 502);
        }

        $wssPath = sprintf('/api2/json/nodes/%s/%s/%d/vncwebsocket', $node, $vmType, (int) $vmInstance['vmid']);
        $wssQuery = 'port=' . $vnc['port'] . '&vncticket=' . rawurlencode($vnc['ticket']);
        $host = $vmNode['fqdn'] ?? '';
        $portApi = (int) ($vmNode['port'] ?? 8006);
        $scheme = ($vmNode['scheme'] ?? 'https') === 'https' ? 'wss' : 'ws';
        $wssUrl = $scheme . '://' . $host . ':' . $portApi . $wssPath . '?' . $wssQuery;

        return ApiResponse::success([
            'ticket' => $vnc['ticket'],
            'port' => $vnc['port'],
            'node' => $node,
            'vmid' => (int) $vmInstance['vmid'],
            'host' => $host,
            'port_api' => $portApi,
            'wss_url' => $wssUrl,
        ], 'VNC ticket created', 200);
    }

    /**
     * Get VM instances by user UUID.
     */
    private function getVmInstancesByUserUuid(string $userUuid): array
    {
        $pdo = \App\Chat\Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT i.*, n.name AS node_name, n.fqdn AS node_fqdn
            FROM featherpanel_vm_instances i
            LEFT JOIN featherpanel_vm_nodes n ON n.id = i.vm_node_id
            WHERE i.user_uuid = :user_uuid
            ORDER BY i.created_at DESC
        ');
        $stmt->execute(['user_uuid' => $userUuid]);

        $instances = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        
        foreach ($instances as &$instance) {
            $instance['is_owner'] = true;
            $instance['is_subuser'] = false;
        }

        return $instances;
    }

    /**
     * Build Proxmox client for a VM node.
     */
    private function buildProxmoxClientForNode(array $vmNode): Proxmox
    {
        $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
        $extraHeaders = [];
        $extraParams = [];

        if (!empty($vmNode['addional_headers']) && is_string($vmNode['addional_headers'])) {
            $decoded = json_decode($vmNode['addional_headers'], true);
            if (is_array($decoded)) {
                foreach ($decoded as $key => $value) {
                    if (is_string($key) && (is_string($value) || is_numeric($value))) {
                        $extraHeaders[$key] = (string) $value;
                    }
                }
            }
        }

        if (!empty($vmNode['additional_params']) && is_string($vmNode['additional_params'])) {
            $decoded = json_decode($vmNode['additional_params'], true);
            if (is_array($decoded)) {
                foreach ($decoded as $key => $value) {
                    if (is_string($key) && (is_string($value) || is_numeric($value))) {
                        $extraParams[$key] = $value;
                    }
                }
            }
        }

        return new Proxmox(
            $vmNode['fqdn'],
            (int) $vmNode['port'],
            $vmNode['scheme'],
            $vmNode['user'],
            $vmNode['token_id'],
            $vmNode['secret'],
            $tlsNoVerify,
            (int) ($vmNode['timeout'] ?? 60),
            $extraHeaders,
            $extraParams,
        );
    }
}