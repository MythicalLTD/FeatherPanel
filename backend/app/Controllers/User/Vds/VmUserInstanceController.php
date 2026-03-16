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
use App\Chat\VmNode;
use App\Chat\Database;
use App\Chat\VmSubuser;
use App\Chat\VmInstance;
use App\Helpers\VmGateway;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\VmCreationPending;
use App\Chat\VmInstanceActivity;
use App\Services\Vm\VmInstanceUtil;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * VmUserInstanceController - User-facing VM instance core operations (list, detail, status, power, VNC).
 * Activities and subusers are in VmUserActivityController and VmUserSubuserController (like Server vs ServerActivity vs SubuserController).
 */
#[OA\Tag(name: 'User - VM Instances', description: 'User VM instance list, detail, status, power, console')]
class VmUserInstanceController
{
    #[OA\Get(
        path: '/api/user/vm-instances',
        summary: 'List user VM instances',
        description: 'Get VM instances owned by or accessible to the authenticated user. Supports optional pagination and search.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, default: 1), description: 'Page number'),
            new OA\Parameter(name: 'limit', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 25), description: 'Records per page'),
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string'), description: 'Search by hostname or IP'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM instances retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'instances', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'pagination', type: 'object', properties: [
                            new OA\Property(property: 'current_page', type: 'integer'),
                            new OA\Property(property: 'per_page', type: 'integer'),
                            new OA\Property(property: 'total_records', type: 'integer'),
                            new OA\Property(property: 'total_pages', type: 'integer'),
                            new OA\Property(property: 'has_next', type: 'boolean'),
                            new OA\Property(property: 'has_prev', type: 'boolean'),
                        ]),
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
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 25)));
        $search = $request->query->get('search', '');
        $search = is_string($search) ? trim($search) : '';

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

        // Optional search filter (hostname or ip_address)
        if ($search !== '') {
            $searchLower = strtolower($search);
            $uniqueInstances = array_values(array_filter($uniqueInstances, static function (array $i) use ($searchLower): bool {
                $host = strtolower((string) ($i['hostname'] ?? ''));
                $ip = strtolower((string) ($i['ip_address'] ?? ''));

                return str_contains($host, $searchLower) || str_contains($ip, $searchLower);
            }));
        }

        $total = count($uniqueInstances);
        $totalPages = $limit > 0 ? (int) ceil($total / $limit) : 1;
        $offset = ($page - 1) * $limit;
        $instancesPage = array_slice($uniqueInstances, $offset, $limit);

        return ApiResponse::success([
            'instances' => $instancesPage,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
            ],
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

        if ($vmInstance['is_subuser']) {
            $subuser = VmSubuser::getSubuserByUserAndVmInstance((int) $user['id'], (int) $vmInstance['id']);
            $vmInstance['permissions'] = $subuser ? json_decode($subuser['permissions'] ?? '[]', true) : [];
        } else {
            // Owner has all permissions
            $vmInstance['permissions'] = ['power', 'console', 'backup', 'activity.read', 'reinstall', 'settings'];
        }

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
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
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
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
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

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id' => (int) $vmInstance['vm_node_id'],
            'user_id' => (int) $user['id'],
            'event' => 'vm:power.' . $action,
            'metadata' => ['hostname' => $vmInstance['hostname'] ?? null],
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);

        $instance = VmInstance::getById($id);

        return ApiResponse::success(['instance' => $instance], 'Power action completed', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/vnc-ticket',
        summary: 'Get VNC console ticket',
        description: 'Get VNC console access ticket. Returns wss_url (and optionally pve_redirect_url when panel can create a short-lived PVE user).',
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
                        new OA\Property(property: 'node', type: 'string'),
                        new OA\Property(property: 'vmid', type: 'integer'),
                        new OA\Property(property: 'host', type: 'string'),
                        new OA\Property(property: 'port_api', type: 'integer'),
                        new OA\Property(property: 'wss_url', type: 'string'),
                        new OA\Property(property: 'pve_redirect_url', type: 'string', nullable: true, description: 'Proxmox noVNC URL when available'),
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

        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'console')) {
            return ApiResponse::error('You do not have permission to access console for this VM', 'PERMISSION_DENIED', 403);
        }

        $vmNode = VmNode::getVmNodeById((int) $vmInstance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $result = VmInstanceUtil::createVncTicketPayload($vmInstance, $vmNode, $id);
        if (!$result['ok']) {
            return ApiResponse::error($result['error'], $result['code'], $result['http_status']);
        }

        return ApiResponse::success($result['payload'], 'VNC ticket created', 200);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/reinstall',
        summary: 'Start async VM reinstall',
        description: 'Starts a full reinstall by cloning from the instance template. Returns 202 with reinstall_id. Poll GET /api/user/vm-instances/reinstall-status/{reinstallId} until status is active or failed. For QEMU/KVM, send ci_user and ci_password in the request body.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'VM instance ID'),
        ],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'ci_user', type: 'string', description: 'Cloud-init username (required for QEMU/KVM)'),
                    new OA\Property(property: 'ci_password', type: 'string', description: 'Cloud-init password (required for QEMU/KVM)'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 202,
                description: 'Reinstall started',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'reinstall_id', type: 'string'),
                        new OA\Property(property: 'message', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request (e.g. missing ci_user/ci_password for QEMU)'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM or template not found'),
            new OA\Response(response: 500, description: 'Server error'),
        ]
    )]
    public function reinstall(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $instance = $request->attributes->get('vmInstance');

        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'reinstall')) {
            return ApiResponse::error('You do not have permission to reinstall this VM', 'PERMISSION_DENIED', 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            $data = [];
        }

        $result = VmInstanceUtil::startReinstall($instance, $data);
        if (!$result['ok']) {
            return ApiResponse::error(
                $result['error'],
                $result['code'],
                $result['http_status']
            );
        }

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id'     => (int) $instance['vm_node_id'],
            'user_id'        => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event'          => 'vm:reinstall.start',
            'metadata'       => ['hostname' => $instance['hostname'] ?? null],
            'ip'             => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'reinstall_id' => $result['reinstall_id'],
            'message'      => $result['message'],
        ], 'VM reinstall started', 202);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/reinstall-status/{reinstallId}',
        summary: 'Poll reinstall status',
        description: 'Poll until status is active or failed. Use the reinstall_id returned from POST .../reinstall. Returns status: cloning (keep polling), failed (with error), or active (with instance).',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'reinstallId', in: 'path', required: true, schema: new OA\Schema(type: 'string'), description: 'Reinstall ID from start reinstall response'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Status (cloning | failed | active)',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', enum: ['cloning', 'failed', 'active']),
                        new OA\Property(property: 'message', type: 'string', description: 'When status=cloning'),
                        new OA\Property(property: 'error', type: 'string', description: 'When status=failed'),
                        new OA\Property(property: 'instance', type: 'object', description: 'When status=active'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Missing reinstall_id'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Reinstall not found or access denied'),
            new OA\Response(response: 500, description: 'Server error'),
        ]
    )]
    public function reinstallStatus(Request $request, string $reinstallId): Response
    {
        $reinstallId = trim($reinstallId);
        if ($reinstallId === '') {
            return ApiResponse::error('Missing reinstall_id', 'INVALID_ID', 400);
        }

        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $pending = VmCreationPending::getByCreationId($reinstallId);
        if (!$pending) {
            return ApiResponse::error('Reinstall not found or already completed', 'NOT_FOUND', 404);
        }

        $rawNotes = $pending['notes'] ?? null;
        $reinstallMeta = [];
        if (is_string($rawNotes) && $rawNotes !== '' && $rawNotes[0] === '{') {
            $decoded = json_decode($rawNotes, true);
            if (is_array($decoded) && ($decoded['type'] ?? '') === 'reinstall') {
                $reinstallMeta = $decoded;
            }
        }
        if (empty($reinstallMeta)) {
            VmCreationPending::deleteByCreationId($reinstallId);

            return ApiResponse::error('Invalid reinstall pending record', 'INVALID_RECORD', 500);
        }

        $instanceId = (int) ($reinstallMeta['instance_id'] ?? 0);
        if ($instanceId <= 0 || !VmGateway::canUserAccessVmInstance($user['uuid'], $instanceId)) {
            return ApiResponse::error('Reinstall not found or access denied', 'NOT_FOUND', 404);
        }

        $vmNode = VmNode::getVmNodeById((int) $pending['vm_node_id']);
        if (!$vmNode) {
            VmCreationPending::deleteByCreationId($reinstallId);

            return ApiResponse::error('VM node not found', 'NODE_NOT_FOUND', 500);
        }

        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed in reinstallStatus: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $taskResult = $client->getTaskStatus($pending['target_node'], $pending['upid']);
        if (!$taskResult['ok'] || $taskResult['status'] !== 'stopped') {
            return ApiResponse::success([
                'status'  => 'cloning',
                'message' => 'Clone in progress…',
            ], 'Clone in progress', 200);
        }

        if (($taskResult['exitstatus'] ?? '') !== 'OK') {
            $errMsg = $taskResult['error'] ?? ('Exit status: ' . ($taskResult['exitstatus'] ?? 'unknown'));
            $client->deleteVm($pending['target_node'], (int) $pending['vmid'], $pending['vm_type'] === 'lxc' ? 'lxc' : 'qemu');
            VmCreationPending::deleteByCreationId($reinstallId);

            return ApiResponse::success([
                'status' => 'failed',
                'error'  => 'Clone failed: ' . $errMsg,
            ], 'Reinstall clone failed', 200);
        }

        $out = VmInstanceUtil::completeReinstallAfterClone($reinstallId, $pending, $reinstallMeta, $client);

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $instanceId,
            'vm_node_id'     => (int) $pending['vm_node_id'],
            'user_id'        => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event'          => 'vm:reinstall.complete',
            'metadata'       => ['new_vmid' => $out['new_vmid']],
            'ip'             => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'status'   => 'active',
            'instance' => $out['instance'],
        ], 'VM reinstalled successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/templates',
        summary: 'Get available templates',
        description: 'Get available templates for the VM instance to reinstall. Limited to the VM type (qemu/lxc).',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Templates retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'templates', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
        ]
    )]
    public function getTemplates(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'reinstall')) {
            return ApiResponse::error('You do not have permission to view templates for this VM', 'PERMISSION_DENIED', 403);
        }

        $type = ($vmInstance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $nodeId = isset($vmInstance['vm_node_id']) ? (int) $vmInstance['vm_node_id'] : 0;

        // Mirror admin behavior:
        // - when we know the node, use VmTemplate::getByNodeId($nodeId)
        // - otherwise fall back to all active templates
        if ($nodeId > 0) {
            $templates = \App\Chat\VmTemplate::getByNodeId($nodeId);
        } else {
            $templates = \App\Chat\VmTemplate::getAll(true);
        }

        // Filter by guest_type (qemu vs lxc)
        $filtered = array_values(array_filter(
            $templates,
            static function ($t) use ($type): bool {
                return ($t['guest_type'] ?? 'qemu') === $type;
            }
        ));

        // Fallback: if nothing matches but the instance has a template_id, only expose that exact template
        // (still respecting guest_type for safety).
        if (empty($filtered) && !empty($vmInstance['template_id'])) {
            $instanceTemplate = \App\Chat\VmTemplate::getById((int) $vmInstance['template_id']);
            if ($instanceTemplate && (($instanceTemplate['guest_type'] ?? 'qemu') === $type)) {
                $filtered = [$instanceTemplate];
            }
        }

        return ApiResponse::success(['templates' => $filtered], 'Templates retrieved', 200);
    }

    /**
     * Get VM instances by user UUID (owned by user).
     */
    private function getVmInstancesByUserUuid(string $userUuid): array
    {
        $pdo = Database::getPdoConnection();
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
}
