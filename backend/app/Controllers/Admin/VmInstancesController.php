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

namespace App\Controllers\Admin;

use App\App;
use App\Chat\User;
use App\Chat\VmIp;
use App\Chat\VmNode;
use App\Chat\VmTask;
use App\Chat\Activity;
use App\Chat\Database;
use App\Chat\VmInstance;
use App\Chat\VmTemplate;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\VmInstanceBackup;
use App\Config\ConfigInterface;
use App\Chat\VmInstanceActivity;
use App\Services\Proxmox\Proxmox;
use App\Mail\templates\VmSuspended;
use App\Services\Vm\VmInstanceUtil;
use App\CloudFlare\CloudFlareRealIP;
use App\Mail\templates\VmUnsuspended;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'VmInstance',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'VM Instance ID'),
        new OA\Property(property: 'vmid', type: 'integer', description: 'Proxmox VMID'),
        new OA\Property(property: 'vm_node_id', type: 'integer', description: 'VM Node ID'),
        new OA\Property(property: 'user_uuid', type: 'string', nullable: true, description: 'User UUID'),
        new OA\Property(property: 'pve_node', type: 'string', description: 'Proxmox node name'),
        new OA\Property(property: 'plan_id', type: 'integer', nullable: true, description: 'Plan ID'),
        new OA\Property(property: 'template_id', type: 'integer', nullable: true, description: 'Template ID'),
        new OA\Property(property: 'vm_type', type: 'string', enum: ['qemu', 'lxc'], description: 'VM Type'),
        new OA\Property(property: 'hostname', type: 'string', description: 'Hostname'),
        new OA\Property(property: 'status', type: 'string', description: 'VM Status'),
        new OA\Property(property: 'ip_address', type: 'string', description: 'IP Address'),
        new OA\Property(property: 'subnet_mask', type: 'string', nullable: true, description: 'Subnet Mask'),
        new OA\Property(property: 'gateway', type: 'string', nullable: true, description: 'Gateway'),
        new OA\Property(property: 'vm_ip_id', type: 'integer', nullable: true, description: 'VM IP ID'),
        new OA\Property(property: 'notes', type: 'string', nullable: true, description: 'Notes'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'VmInstancePagination',
    type: 'object',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
        new OA\Property(property: 'per_page', type: 'integer', description: 'Records per page'),
        new OA\Property(property: 'total_records', type: 'integer', description: 'Total number of records'),
        new OA\Property(property: 'total_pages', type: 'integer', description: 'Total number of pages'),
        new OA\Property(property: 'has_next', type: 'boolean', description: 'Whether there is a next page'),
        new OA\Property(property: 'has_prev', type: 'boolean', description: 'Whether there is a previous page'),
    ]
)]
#[OA\Schema(
    schema: 'VmInstanceCreate',
    type: 'object',
    required: ['vm_node_id', 'template_id'],
    properties: [
        new OA\Property(property: 'vm_node_id', type: 'integer', description: 'VM Node ID'),
        new OA\Property(property: 'template_id', type: 'integer', description: 'Template ID'),
        new OA\Property(property: 'memory', type: 'integer', description: 'Memory in MB', default: 512),
        new OA\Property(property: 'cpus', type: 'integer', description: 'Number of CPU sockets', default: 1),
        new OA\Property(property: 'cores', type: 'integer', description: 'Number of CPU cores per socket', default: 1),
        new OA\Property(property: 'disk', type: 'integer', description: 'Disk size in GB', default: 10),
        new OA\Property(property: 'storage', type: 'string', description: 'Storage name', default: 'local'),
        new OA\Property(property: 'bridge', type: 'string', description: 'Network bridge', default: 'vmbr0'),
        new OA\Property(property: 'on_boot', type: 'integer', description: 'Start on boot', default: 1),
        new OA\Property(property: 'hostname', type: 'string', nullable: true, description: 'Hostname'),
        new OA\Property(property: 'vm_ip_id', type: 'integer', nullable: true, description: 'Specific IP ID to assign'),
        new OA\Property(property: 'user_uuid', type: 'string', nullable: true, description: 'User UUID'),
        new OA\Property(property: 'notes', type: 'string', nullable: true, description: 'Notes'),
        new OA\Property(property: 'ci_user', type: 'string', nullable: true, description: 'Cloud-init user (required for KVM/QEMU)'),
        new OA\Property(property: 'ci_password', type: 'string', nullable: true, description: 'Cloud-init password (required for KVM/QEMU). Not used for LXC.'),
    ]
)]
#[OA\Schema(
    schema: 'VmInstanceUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'hostname', type: 'string', nullable: true, description: 'Hostname'),
        new OA\Property(property: 'notes', type: 'string', nullable: true, description: 'Notes'),
        new OA\Property(property: 'user_uuid', type: 'string', nullable: true, description: 'User UUID'),
        new OA\Property(property: 'vm_ip_id', type: 'integer', nullable: true, description: 'VM IP ID'),
        new OA\Property(property: 'memory', type: 'integer', nullable: true, description: 'Memory in MB'),
        new OA\Property(property: 'cpus', type: 'integer', nullable: true, description: 'Number of CPUs'),
        new OA\Property(property: 'cores', type: 'integer', nullable: true, description: 'Number of Cores'),
        new OA\Property(property: 'on_boot', type: 'boolean', nullable: true, description: 'Start on boot'),
        new OA\Property(property: 'networks', type: 'array', items: new OA\Items(type: 'object'), nullable: true, description: 'List of networks (LXC)'),
        new OA\Property(property: 'nameserver', type: 'string', nullable: true, description: 'Nameserver (LXC)'),
        new OA\Property(property: 'searchdomain', type: 'string', nullable: true, description: 'Search domain (LXC)'),
        new OA\Property(property: 'bios', type: 'string', nullable: true, description: 'QEMU BIOS mode: seabios or ovmf (EFI)'),
        new OA\Property(property: 'efi_enabled', type: 'boolean', nullable: true, description: 'Enable EFI disk (QEMU only)'),
        new OA\Property(property: 'efi_storage', type: 'string', nullable: true, description: 'Storage for EFI disk (QEMU only)'),
        new OA\Property(property: 'tpm_enabled', type: 'boolean', nullable: true, description: 'Enable TPM state disk (QEMU only)'),
        new OA\Property(property: 'tpm_storage', type: 'string', nullable: true, description: 'Storage for TPM state disk (QEMU only)'),
    ]
)]
class VmInstancesController
{
    #[OA\Get(
        path: '/api/admin/vm-instances',
        summary: 'List VM instances',
        description: 'Get a paginated list of VM instances with optional search.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', description: 'Page number', required: false, schema: new OA\Schema(type: 'integer', default: 1)),
            new OA\Parameter(name: 'limit', in: 'query', description: 'Records per page', required: false, schema: new OA\Schema(type: 'integer', default: 25)),
            new OA\Parameter(name: 'search', in: 'query', description: 'Search term', required: false, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM instances retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'instances', type: 'array', items: new OA\Items(ref: '#/components/schemas/VmInstance')),
                        new OA\Property(property: 'status_counts', type: 'object'),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/VmInstancePagination'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function index(Request $request): Response
    {
        $page   = max(1, (int) $request->query->get('page', 1));
        $limit  = min(100, max(1, (int) $request->query->get('limit', 25)));
        $search = $request->query->get('search', null);

        $instances    = VmInstance::getAll($page, $limit, $search);
        $total        = VmInstance::countAll($search);
        $totalPages   = (int) ceil($total / $limit);
        $statusCounts = VmInstance::countByStatus();

        return ApiResponse::success([
            'instances'     => $instances,
            'status_counts' => $statusCounts,
            'pagination'    => [
                'current_page'  => $page,
                'per_page'      => $limit,
                'total_records' => $total,
                'total_pages'   => $totalPages,
                'has_next'      => $page < $totalPages,
                'has_prev'      => $page > 1,
            ],
        ], 'VM instances fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/vm-instances',
        summary: 'Create new VM instance',
        description: 'Create a new VM instance (server) on a Proxmox node. Returns 202 with creation_id. Poll creation-status until active or failed.',
        tags: ['Admin - VM Instances'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/VmInstanceCreate')
        ),
        responses: [
            new OA\Response(
                response: 202,
                description: 'VM creation started',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'creation_id', type: 'string'),
                        new OA\Property(property: 'message', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM node or template not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }

        $vmNodeId = isset($data['vm_node_id']) ? (int) $data['vm_node_id'] : 0;
        if ($vmNodeId <= 0) {
            return ApiResponse::error('vm_node_id is required and must be a positive integer', 'VALIDATION_FAILED', 400);
        }

        $vmNode = VmNode::getVmNodeById($vmNodeId);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $templateId = isset($data['template_id']) ? (int) $data['template_id'] : 0;
        if ($templateId <= 0) {
            return ApiResponse::error('template_id is required', 'TEMPLATE_REQUIRED', 400);
        }

        $template = VmTemplate::getById($templateId);
        if (!$template) {
            return ApiResponse::error('Template not found', 'TEMPLATE_NOT_FOUND', 404);
        }

        $vmType = ($template['guest_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $templateFile = $template['template_file'] ?? '';
        if ($templateFile === '' || !ctype_digit($templateFile)) {
            return ApiResponse::error('Template must have a valid template VMID (template_file)', 'INVALID_TEMPLATE', 400);
        }
        $templateVmid = (int) $templateFile;

        $memory = isset($data['memory']) ? (int) $data['memory'] : 512;
        $cpus = isset($data['cpus']) ? (int) $data['cpus'] : 1;
        $cores = isset($data['cores']) ? (int) $data['cores'] : 1;
        $disk = isset($data['disk']) ? (int) $data['disk'] : 10;
        if ($memory < 128) {
            $memory = 128;
        }
        if ($cpus < 1) {
            $cpus = 1;
        }
        if ($cores < 1) {
            $cores = 1;
        }
        if ($disk < 1) {
            $disk = 1;
        }

        $storage = isset($data['storage']) && is_string($data['storage']) && $data['storage'] !== '' ? trim($data['storage']) : 'local';
        $bridge = isset($data['bridge']) && is_string($data['bridge']) && $data['bridge'] !== '' ? trim($data['bridge']) : 'vmbr0';
        $onBoot = isset($data['on_boot']) ? (int) (bool) $data['on_boot'] : 1;
        $backupLimit = isset($data['backup_limit']) && is_numeric($data['backup_limit']) ? max(0, min(100, (int) $data['backup_limit'])) : 5;

        $hostnameRaw = isset($data['hostname']) && is_string($data['hostname']) ? trim($data['hostname']) : null;
        $hostname = self::sanitizeHostnameForProxmox($hostnameRaw);

        $vmIpId = isset($data['vm_ip_id']) ? (int) $data['vm_ip_id'] : null;
        $freeIps = VmIp::getFreeIpsForNode($vmNodeId);
        if (empty($freeIps)) {
            return ApiResponse::error('No free IP addresses available for this node. Add IPs in VM Node IPs.', 'NO_FREE_IP', 400);
        }
        if ($vmIpId !== null && $vmIpId > 0) {
            $found = null;
            foreach ($freeIps as $f) {
                if ((int) $f['id'] === $vmIpId) {
                    $found = $f;
                    break;
                }
            }
            if ($found === null) {
                return ApiResponse::error('Invalid vm_ip_id or IP is already assigned to another instance', 'INVALID_VM_IP', 400);
            }
            $ip = $found;
        } else {
            $ip = $freeIps[0];
            $vmIpId = (int) $ip['id'];
        }

        $userUuid = isset($data['user_uuid']) && is_string($data['user_uuid']) ? trim($data['user_uuid']) : null;

        $notesRaw = isset($data['notes']) && is_string($data['notes']) ? trim($data['notes']) : null;
        $ciUserInput = isset($data['ci_user']) && is_string($data['ci_user']) ? trim($data['ci_user']) : null;
        $ciPasswordInput = isset($data['ci_password']) && is_string($data['ci_password']) ? trim($data['ci_password']) : null;
        if ($vmType === 'qemu') {
            if ($ciUserInput === null || $ciUserInput === '') {
                return ApiResponse::error('Cloud-init user (ci_user) is required for KVM/QEMU templates', 'VALIDATION_FAILED', 400);
            }
            if ($ciPasswordInput === null || $ciPasswordInput === '') {
                return ApiResponse::error('Cloud-init password (ci_password) is required for KVM/QEMU templates', 'VALIDATION_FAILED', 400);
            }
        }
        $metaNotes = [
            'notes' => $notesRaw,
            'ci_user' => $ciUserInput,
            'ci_password' => $ciPasswordInput,
        ];
        $notes = json_encode($metaNotes, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $nodesResult = $client->getNodes();
        if (!$nodesResult['ok'] || empty($nodesResult['nodes'])) {
            return ApiResponse::error(
                'Could not get Proxmox nodes: ' . ($nodesResult['error'] ?? 'unknown'),
                'PROXMOX_ERROR',
                500
            );
        }
        $targetNode = (string) $nodesResult['nodes'][0]['node'];

        $nextResult = $client->getNextVmid(5000);
        if (!$nextResult['ok'] || $nextResult['vmid'] === null) {
            return ApiResponse::error(
                'Could not get next VMID: ' . ($nextResult['error'] ?? 'unknown'),
                'PROXMOX_ERROR',
                500
            );
        }
        $vmid = $nextResult['vmid'];

        $findNode = $client->findNodeByVmid($templateVmid);
        $templateNode = $findNode['ok'] ? $findNode['node'] : $targetNode;

        $meta = [
            'hostname'      => $hostname,
            'vm_node_id'    => $vmNodeId,
            'template_id'   => $templateId,
            'template_vmid' => $templateVmid,
            'template_node' => $templateNode,
            'vm_ip_id'      => $vmIpId,
            'notes'         => $notesRaw,
            'vm_type'       => $vmType,
            'memory'        => $memory,
            'cpus'          => $cpus,
            'cores'         => $cores,
            'disk'          => $disk,
            'storage'       => $storage,
            'bridge'        => $bridge,
            'on_boot'       => $onBoot,
            'backup_limit'  => $backupLimit,
            'ci_user'       => $ciUserInput,
            'ci_password'   => $ciPasswordInput,
            'current_step'  => 'initial',
        ];

        $creationId = VmInstanceUtil::createVmTask(
            ['user_uuid' => $userUuid, 'vm_node_id' => $vmNodeId, 'vmid' => $vmid],
            'create',
            '', // empty UPID so runner initiates the clone
            $meta,
            $vmid,
            $targetNode
        );

        return ApiResponse::success([
            'creation_id' => $creationId,
            'message'     => 'VM creation scheduled successfully. The task is now in queue.',
        ], 'VM creation scheduled', 202);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/creation-status/{creationId}',
        summary: 'Poll VM creation status',
        description: 'Poll status of an async VM creation. Returns status cloning, active, or failed.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'creationId', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Creation status',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', enum: ['cloning', 'active', 'failed']),
                        new OA\Property(property: 'message', type: 'string', nullable: true),
                        new OA\Property(property: 'error', type: 'string', nullable: true),
                        new OA\Property(property: 'instance', ref: '#/components/schemas/VmInstance', nullable: true),
                        new OA\Property(property: 'ci_user', type: 'string', nullable: true),
                        new OA\Property(property: 'ci_password', type: 'string', nullable: true),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Missing creation_id'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Creation not found or already completed'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function creationStatus(Request $request, string $creationId): Response
    {
        $creationId = trim($creationId);
        if ($creationId === '') {
            return ApiResponse::error('Missing creation_id', 'INVALID_ID', 400);
        }

        $task = VmTask::getByTaskId($creationId);
        if (!$task) {
            // Check if it was already deleted or move to permanent instance
            $idMatch = preg_match('/^[a-f0-9]{32}$/', $creationId);
            if ($idMatch) {
                return ApiResponse::error('Creation not found or already completed', 'NOT_FOUND', 404);
            }

            return ApiResponse::error('Invalid creation_id', 'INVALID_ID', 400);
        }

        $status = $task['status'];
        $meta = json_decode($task['data'] ?? '{}', true);

        if ($status === 'completed') {
            $instance = VmInstance::getByVmidAndNode((int) $task['vmid'], (int) $task['vm_node_id']);

            return ApiResponse::success([
                'status' => 'active',
                'instance' => $instance,
                'ci_user' => $meta['ci_user'] ?? null,
                'ci_password' => $meta['ci_password'] ?? null,
            ], 'VM instance created successfully', 200);
        }

        if ($status === 'failed') {
            return ApiResponse::success([
                'status' => 'failed',
                'error' => $task['error'] ?? 'Unknown error during creation',
            ], 'Creation failed', 200);
        }

        if ($status === 'pending') {
            return ApiResponse::success([
                'status'  => 'pending',
                'message' => 'Task added to queue and scheduled to task processor…',
            ], 'Creation pending', 200);
        }

        return ApiResponse::success([
            'status'  => 'cloning',
            'message' => $status === 'running' ? 'Cloning VM from template…' : 'Finalizing VM configuration…',
        ], 'Creation in progress', 200);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/{id}',
        summary: 'Get VM instance',
        description: 'Get a single VM instance by ID.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM instance retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'instance', ref: '#/components/schemas/VmInstance'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $extra = [];
        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        if (!empty($instance['template_id']) && $vmType === 'lxc') {
            $template = VmTemplate::getById((int) $instance['template_id']);
            if ($template && !empty($template['lxc_root_password'])) {
                $extra['lxc_root_password'] = (string) $template['lxc_root_password'];
            }
        }

        return ApiResponse::success(
            ['instance' => array_merge($instance, $extra)],
            'VM instance fetched successfully',
            200
        );
    }

    #[OA\Patch(
        path: '/api/admin/vm-instances/{id}',
        summary: 'Update VM instance',
        description: 'Update instance: hostname, notes, user_uuid, vm_ip_id, memory, cpus, cores, on_boot, networks.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/VmInstanceUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM instance updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'instance', ref: '#/components/schemas/VmInstance'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'Proxmox update failed'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }

        $dbKeys = ['hostname', 'notes', 'user_uuid', 'vm_ip_id'];
        $dbUpdate = array_intersect_key($data, array_flip($dbKeys));
        $proxmoxKeys = ['memory', 'cpus', 'cores', 'on_boot', 'vm_ip_id', 'bios', 'efi_enabled', 'efi_storage', 'tpm_enabled', 'tpm_storage'];
        $proxmoxUpdate = array_intersect_key($data, array_flip($proxmoxKeys));
        $networks = isset($data['networks']) && is_array($data['networks']) ? $data['networks'] : null;
        if ($networks !== null && !empty($networks)) {
            $first = reset($networks);
            $firstIpId = isset($first['vm_ip_id']) ? (int) $first['vm_ip_id'] : null;
            $dbUpdate['vm_ip_id'] = $firstIpId;
        }
        $vmTypeCheck = ($instance['vm_type'] ?? 'qemu') === 'lxc';
        $dnsUpdate = $vmTypeCheck && (
            array_key_exists('nameserver', $data) || array_key_exists('searchdomain', $data)
        );
        $hasProxmox = !empty($proxmoxUpdate) || $networks !== null || $dnsUpdate;

        if (empty($dbUpdate) && !$hasProxmox) {
            return ApiResponse::success(['instance' => VmInstance::getById($id)], 'No changes to apply', 200);
        }

        if (!empty($dbUpdate)) {
            $ok = VmInstance::update($id, $dbUpdate);
            if (!$ok) {
                return ApiResponse::error('Failed to update VM instance', 'UPDATE_FAILED', 500);
            }
            $instance = VmInstance::getById($id);
        }

        if ($hasProxmox) {
            $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
            if (!$vmNode) {
                return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
            }
            try {
                $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

                return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
            }

            $node = $instance['pve_node'] ?? '';
            if ($node === '') {
                $find = $client->findNodeByVmid((int) $instance['vmid']);
                $node = $find['ok'] ? $find['node'] : null;
            }
            if ($node === null || $node === '') {
                return ApiResponse::error('Could not determine Proxmox node for this VM', 'NODE_UNKNOWN', 500);
            }

            $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
            $memory = array_key_exists('memory', $proxmoxUpdate) ? (int) $proxmoxUpdate['memory'] : null;
            $cpus = array_key_exists('cpus', $proxmoxUpdate) ? (int) $proxmoxUpdate['cpus'] : null;
            $cores = array_key_exists('cores', $proxmoxUpdate) ? (int) $proxmoxUpdate['cores'] : null;
            $onBoot = array_key_exists('on_boot', $proxmoxUpdate) ? (bool) $proxmoxUpdate['on_boot'] : null;
            $ipChange = array_key_exists('vm_ip_id', $proxmoxUpdate) && $networks === null;

            $ip = null;
            if ($ipChange && isset($instance['vm_ip_id']) && (int) $instance['vm_ip_id'] > 0) {
                $ip = VmIp::getById((int) $instance['vm_ip_id']);
            }
            if ($ipChange && (!$ip || !$ip['ip'])) {
                $ip = null;
            }

            $config = [];
            $deleteKeys = [];

            // Optional QEMU-only extras: BIOS mode, EFI disk, TPM state disk. (Most likely needed for cloudinit :)))))))
            $curQemuConfig = [];
            if ($vmType === 'qemu') {
                $curCfgQemu = $client->getVmConfig($node, (int) $instance['vmid'], 'qemu');
                if ($curCfgQemu['ok'] && is_array($curCfgQemu['config'] ?? null)) {
                    /** @var array<string, mixed> $curQemuConfigTmp */
                    $curQemuConfigTmp = $curCfgQemu['config'];
                    $curQemuConfig = $curQemuConfigTmp;
                }
            }

            if ($vmType === 'lxc' && $networks !== null) {
                $curCfg = $client->getVmConfig($node, (int) $instance['vmid'], 'lxc');
                $curConfig = $curCfg['ok'] && is_array($curCfg['config'] ?? null) ? $curCfg['config'] : [];
                $currentNetKeys = array_values(array_filter(array_keys($curConfig), static function ($k) {
                    return preg_match('/^net\d+$/', (string) $k);
                }));
                if (empty($networks)) {
                    $deleteKeys = $currentNetKeys;
                }
            }

            if ($vmType === 'lxc' && $networks !== null && !empty($networks)) {
                $newKeys = array_values(array_map(static function ($n) {
                    return isset($n['key']) ? (string) $n['key'] : '';
                }, $networks));
                $newKeys = array_values(array_filter($newKeys, static function ($k) {
                    return preg_match('/^net\d+$/', $k);
                }));
                foreach ($currentNetKeys as $k) {
                    if (!in_array($k, $newKeys, true)) {
                        $deleteKeys[] = $k;
                    }
                }
                $bridge = 'vmbr0';
                if (!empty($curConfig['net0']) && preg_match('/bridge=([^,\s]+)/', (string) $curConfig['net0'], $m)) {
                    $bridge = $m[1];
                }
                foreach ($networks as $n) {
                    $key = isset($n['key']) ? (string) $n['key'] : '';
                    if (!preg_match('/^net\d+$/', $key)) {
                        continue;
                    }
                    $vmIpId = isset($n['vm_ip_id']) ? (int) $n['vm_ip_id'] : 0;
                    $ipRow = $vmIpId > 0 ? VmIp::getById($vmIpId) : null;
                    if (!$ipRow || empty($ipRow['ip'])) {
                        continue;
                    }
                    $netBridge = isset($n['bridge']) && (string) $n['bridge'] !== '' ? (string) $n['bridge'] : $bridge;
                    $cidr = isset($ipRow['cidr']) && $ipRow['cidr'] !== null ? (int) $ipRow['cidr'] : 24;
                    $gateway = trim((string) ($ipRow['gateway'] ?? ''));
                    $ethName = isset($n['name']) ? (string) $n['name'] : ('eth' . (int) preg_replace('/\D/', '', $key));
                    $ipStr = str_replace([',', '='], '', (string) $ipRow['ip']);
                    $netStr = 'name=' . $ethName . ',bridge=' . $netBridge . ',ip=' . $ipStr . '/' . $cidr;
                    if ($gateway !== '') {
                        $netStr .= ',gw=' . str_replace([',', '='], '', $gateway);
                    }
                    $config[$key] = $netStr;
                }
            }

            if ($vmType === 'lxc') {
                if (array_key_exists('nameserver', $data)) {
                    $config['nameserver'] = trim((string) $data['nameserver']);
                }
                if (array_key_exists('searchdomain', $data)) {
                    $config['searchdomain'] = trim((string) $data['searchdomain']);
                }
            }
            if ($memory !== null && $memory >= 128) {
                $config['memory'] = $memory;
                $dbUpdate['memory'] = $memory;
            }
            if ($onBoot !== null) {
                $config['onboot'] = $onBoot ? 1 : 0;
                $dbUpdate['on_boot'] = $onBoot;
            }
            if ($vmType === 'lxc' && $networks === null) {
                if ($cpus !== null && $cores !== null) {
                    $config['cores'] = $cpus * $cores;
                    $dbUpdate['cpus'] = $cpus;
                    $dbUpdate['cores'] = $cores;
                } elseif ($cores !== null) {
                    $config['cores'] = $cores;
                    $dbUpdate['cores'] = $cores;
                    $dbUpdate['cpus'] = $cores;
                }
                if ($ip) {
                    $cidr = isset($ip['cidr']) && $ip['cidr'] !== null ? (int) $ip['cidr'] : 24;
                    $gateway = trim((string) ($ip['gateway'] ?? ''));
                    $bridge = 'vmbr0';
                    $curCfg = $client->getVmConfig($node, (int) $instance['vmid'], 'lxc');
                    if ($curCfg['ok'] && !empty($curCfg['config']['net0'])) {
                        if (preg_match('/bridge=([^,\s]+)/', (string) $curCfg['config']['net0'], $m)) {
                            $bridge = $m[1];
                        }
                    }
                    $ipStr = str_replace([',', '='], '', (string) $ip['ip']);
                    $net0 = 'name=eth0,bridge=' . $bridge . ',ip=' . $ipStr . '/' . $cidr;
                    if ($gateway !== '') {
                        $net0 .= ',gw=' . str_replace([',', '='], '', $gateway);
                    }
                    $config['net0'] = $net0;
                }
            } elseif ($vmType === 'qemu') {
                if ($cpus !== null) {
                    $config['sockets'] = $cpus;
                    $dbUpdate['cpus'] = $cpus;
                }
                if ($cores !== null) {
                    $config['cores'] = $cores;
                    $dbUpdate['cores'] = $cores;
                }
                if ($ip) {
                    $cidr = isset($ip['cidr']) && $ip['cidr'] !== null ? (int) $ip['cidr'] : 24;
                    $gateway = $ip['gateway'] ?? '';
                    $ipconfig0 = 'ip=' . $ip['ip'] . '/' . $cidr;
                    if ($gateway !== '') {
                        $ipconfig0 .= ',gw=' . $gateway;
                    }
                    $config['ipconfig0'] = $ipconfig0;
                }

                // BIOS mode: seabios or ovmf
                if (array_key_exists('bios', $data) && is_string($data['bios'])) {
                    $bios = strtolower(trim($data['bios']));
                    if (in_array($bios, ['seabios', 'ovmf'], true)) {
                        $config['bios'] = $bios;
                    }
                }

                // EFI disk: efidisk0
                $efiEnabled = array_key_exists('efi_enabled', $data) ? (bool) $proxmoxUpdate['efi_enabled'] : null;
                if ($efiEnabled === true && !isset($curQemuConfig['efidisk0'])) {
                    $nodeEfiStorage = isset($vmNode['storage_efi']) && is_string($vmNode['storage_efi'])
                        ? trim($vmNode['storage_efi'])
                        : '';
                    // Enforce VDS node defaults; ignore any client-provided efi_storage override.
                    $storageName = $nodeEfiStorage !== '' ? $nodeEfiStorage : 'local-lvm';
                    // Let Proxmox allocate an EFI disk (special-case size handling, value "0" per qm docs).
                    $config['efidisk0'] = $storageName . ':0,efitype=4m,pre-enrolled-keys=1';
                    if (!isset($config['bios'])) {
                        $config['bios'] = 'ovmf';
                    }
                } elseif ($efiEnabled === false && isset($curQemuConfig['efidisk0'])) {
                    // Fully delete EFI disk: unlink efidisk0, then matching unusedN.
                    $efiVolRef = null;
                    if (is_string($curQemuConfig['efidisk0'])) {
                        $parts = explode(',', $curQemuConfig['efidisk0']);
                        $efiVolRef = trim($parts[0]);
                    }
                    $unlinkEfi = $client->unlinkQemuDisks($node, (int) $instance['vmid'], ['efidisk0']);
                    if (!$unlinkEfi['ok']) {
                        App::getInstance(true)->getLogger()->warning(
                            'Failed to unlink EFI disk efidisk0 for VM ' . $instance['vmid'] . ': ' . ($unlinkEfi['error'] ?? 'unknown')
                        );
                    } elseif ($efiVolRef !== null && $efiVolRef !== '') {
                        $cfgAfter = $client->getVmConfig($node, (int) $instance['vmid'], 'qemu');
                        if ($cfgAfter['ok'] && is_array($cfgAfter['config'] ?? null)) {
                            /** @var array<string, mixed> $cfgArrAfter */
                            $cfgArrAfter = $cfgAfter['config'];
                            $unusedKey = null;
                            foreach ($cfgArrAfter as $cfgKey => $value) {
                                if (!is_string($cfgKey) || !preg_match('/^unused\d+$/', $cfgKey)) {
                                    continue;
                                }
                                $val = is_string($value) ? $value : '';
                                if ($val !== '' && str_starts_with($val, $efiVolRef)) {
                                    $unusedKey = $cfgKey;
                                    break;
                                }
                            }
                            if ($unusedKey !== null) {
                                $unlinkUnused = $client->unlinkQemuDisks($node, (int) $instance['vmid'], [$unusedKey]);
                                if (!$unlinkUnused['ok']) {
                                    App::getInstance(true)->getLogger()->warning(
                                        'Failed to destroy unused EFI disk ' . $unusedKey . ' for VM ' . $instance['vmid'] . ': ' . ($unlinkUnused['error'] ?? 'unknown')
                                    );
                                }
                            }
                        }
                    }
                }

                // TPM state disk: tpmstate0 (v2.0)
                $tpmEnabled = array_key_exists('tpm_enabled', $data) ? (bool) $proxmoxUpdate['tpm_enabled'] : null;
                if ($tpmEnabled === true && !isset($curQemuConfig['tpmstate0'])) {
                    $nodeTpmStorage = isset($vmNode['storage_tpm']) && is_string($vmNode['storage_tpm'])
                        ? trim($vmNode['storage_tpm'])
                        : '';
                    // Enforce VDS node defaults; ignore any client-provided tpm_storage override.
                    $storageName = $nodeTpmStorage !== '' ? $nodeTpmStorage : 'local-lvm';
                    $config['tpmstate0'] = $storageName . ':1,format=qcow2,version=v2.0';
                } elseif ($tpmEnabled === false && isset($curQemuConfig['tpmstate0'])) {
                    $tpmVolRef = null;
                    if (is_string($curQemuConfig['tpmstate0'])) {
                        $parts = explode(',', $curQemuConfig['tpmstate0']);
                        $tpmVolRef = trim($parts[0]);
                    }
                    $unlinkTpm = $client->unlinkQemuDisks($node, (int) $instance['vmid'], ['tpmstate0']);
                    if (!$unlinkTpm['ok']) {
                        App::getInstance(true)->getLogger()->warning(
                            'Failed to unlink TPM disk tpmstate0 for VM ' . $instance['vmid'] . ': ' . ($unlinkTpm['error'] ?? 'unknown')
                        );
                    } elseif ($tpmVolRef !== null && $tpmVolRef !== '') {
                        $cfgAfter = $client->getVmConfig($node, (int) $instance['vmid'], 'qemu');
                        if ($cfgAfter['ok'] && is_array($cfgAfter['config'] ?? null)) {
                            /** @var array<string, mixed> $cfgArrAfter */
                            $cfgArrAfter = $cfgAfter['config'];
                            $unusedKey = null;
                            foreach ($cfgArrAfter as $cfgKey => $value) {
                                if (!is_string($cfgKey) || !preg_match('/^unused\d+$/', $cfgKey)) {
                                    continue;
                                }
                                $val = is_string($value) ? $value : '';
                                if ($val !== '' && str_starts_with($val, $tpmVolRef)) {
                                    $unusedKey = $cfgKey;
                                    break;
                                }
                            }
                            if ($unusedKey !== null) {
                                $unlinkUnused = $client->unlinkQemuDisks($node, (int) $instance['vmid'], [$unusedKey]);
                                if (!$unlinkUnused['ok']) {
                                    App::getInstance(true)->getLogger()->warning(
                                        'Failed to destroy unused TPM disk ' . $unusedKey . ' for VM ' . $instance['vmid'] . ': ' . ($unlinkUnused['error'] ?? 'unknown')
                                    );
                                }
                            }
                        }
                    }
                }
            } elseif ($vmType === 'lxc') {
                if ($cpus !== null && $cores !== null) {
                    $config['cores'] = $cpus * $cores;
                } elseif ($cores !== null) {
                    $config['cores'] = $cores;
                }
            }

            if (!empty($config) || !empty($deleteKeys)) {
                $res = $client->setVmConfig($node, (int) $instance['vmid'], $vmType, $config, $deleteKeys);
                if (!$res['ok']) {
                    return ApiResponse::error('Proxmox config update failed: ' . ($res['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
                }
            }
        }

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'vm_instance_update',
            'context' => 'Updated VM instance: ' . ($instance['hostname'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id' => (int) ($instance['vm_node_id'] ?? 0),
            'user_id' => isset($admin['id']) ? (int) $admin['id'] : null,
            'event' => 'vm:update',
            'metadata' => ['hostname' => $instance['hostname'] ?? null],
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['instance' => VmInstance::getById($id)], 'VM instance updated successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/{id}/config',
        summary: 'Get VM instance config',
        description: 'GET Proxmox config for this instance.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Config fetched successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'config', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'Proxmox error'),
        ]
    )]
    public function getConfig(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }
        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $result = $client->getVmConfig($node, (int) $instance['vmid'], $vmType);
        if (!$result['ok']) {
            return ApiResponse::error('Failed to fetch Proxmox config: ' . ($result['error'] ?? ''), 'PROXMOX_ERROR', 502);
        }

        return ApiResponse::success(['config' => $result['config'] ?? []], 'Config fetched', 200);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/{id}/status',
        summary: 'Get VM instance status',
        description: 'GET current VM/container status and resource usage from Proxmox.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Status fetched successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'Proxmox error'),
        ]
    )]
    public function getStatus(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }
        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $result = $client->getVmStatusCurrent($node, (int) $instance['vmid'], $vmType);
        if (!$result['ok']) {
            return ApiResponse::error('Failed to fetch status: ' . ($result['error'] ?? ''), 'PROXMOX_ERROR', 502);
        }

        return ApiResponse::success(['status' => $result['status'] ?? []], 'Status fetched', 200);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/{id}/vnc-ticket',
        summary: 'Get VNC ticket',
        description: 'GET VNC console ticket for QEMU VMs and LXC containers.',
        tags: ['Admin - VM Instances'],
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
                        new OA\Property(property: 'pve_redirect_url', type: 'string', nullable: true),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'VNC proxy failed'),
        ]
    )]
    public function vncTicket(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $result = VmInstanceUtil::createVncTicketPayload($instance, $vmNode, $id);
        if (!$result['ok']) {
            return ApiResponse::error($result['error'], $result['code'], $result['http_status']);
        }

        return ApiResponse::success($result['payload'], 'VNC ticket created (valid ~40s)', 200);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/{id}/activities',
        summary: 'Get VM instance activities',
        description: 'GET activity/task history for this VM instance.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'limit', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 50)),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Activities fetched successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'activities', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
        ]
    )]
    public function activities(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $hostname = trim((string) ($instance['hostname'] ?? ''));
        if ($hostname === '') {
            return ApiResponse::success(['activities' => []], 'No hostname to match', 200);
        }
        $limit = min(100, max(1, (int) ($request->query->get('limit') ?? 50)));
        $activities = Activity::getActivitiesByContextLikeAndNameIn(
            '%' . $hostname . '%',
            ['vm_instance_create', 'vm_instance_update', 'vm_instance_delete'],
            $limit,
        );

        return ApiResponse::success(['activities' => $activities], 'Activities fetched', 200);
    }

    #[OA\Post(
        path: '/api/admin/vm-instances/{id}/resize-disk',
        summary: 'Resize VM/container disk',
        description: 'Resize a disk on an LXC container or QEMU VM. Body must include "disk" and "size".',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'disk', type: 'string', description: 'Disk name e.g. rootfs or mp0'),
                    new OA\Property(property: 'size', type: 'string', description: 'Size to add or absolute e.g. +5G or 20G'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Disk resized successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'Resize failed'),
        ]
    )]
    public function resizeDisk(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['disk']) || empty($data['size'])) {
            return ApiResponse::error('Request body must include "disk" and "size" (e.g. disk: "rootfs" or "scsi0", size: "+5G")', 'VALIDATION_FAILED', 400);
        }
        $disk = (string) $data['disk'];
        $size = (string) $data['size'];
        // Be forgiving: if user enters "20" or "+5" assume GB. (Or we can just do that in the frontend :))))))
        if (preg_match('/^\+?\d+$/', $size)) {
            $size .= 'G';
        }
        if ($vmType === 'lxc') {
            if (!preg_match('/^(rootfs|mp\d+)$/', $disk)) {
                return ApiResponse::error('Invalid disk. Use rootfs or mp0, mp1, ...', 'INVALID_DISK', 400);
            }
        } else {
            if (!preg_match('/^(scsi|virtio|sata|ide)\d+$/', $disk)) {
                return ApiResponse::error('Invalid disk. Use scsi0, scsi1, virtio0, sata0, ide0, ...', 'INVALID_DISK', 400);
            }
        }
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }
        if ($vmType === 'lxc') {
            $res = $client->resizeContainerDisk($node, (int) $instance['vmid'], $disk, $size);
        } else {
            $res = $client->resizeQemuDisk($node, (int) $instance['vmid'], $disk, $size);
        }
        if (!$res['ok']) {
            return ApiResponse::error('Resize failed: ' . ($res['error'] ?? 'unknown'), 'RESIZE_FAILED', 502);
        }
        if (is_string($res['upid'] ?? null) && $res['upid'] !== '') {
            $wait = $client->waitTask($node, (string) $res['upid'], 600, 5);
            if (!$wait['ok']) {
                return ApiResponse::error('Resize task failed: ' . ($wait['error'] ?? 'unknown'), 'RESIZE_FAILED', 502);
            }
        }

        return ApiResponse::success(['message' => 'Disk resized'], 'Disk resized successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/vm-instances/{id}/disks',
        summary: 'Create VM/container disk',
        description: 'Create an additional disk: LXC mount point or QEMU disk.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'storage', type: 'string', description: 'Storage name e.g. local-lvm'),
                    new OA\Property(property: 'size_gb', type: 'integer', description: 'Size in GB'),
                    new OA\Property(property: 'path', type: 'string', nullable: true, description: 'Mount point path e.g. /mnt/data'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Disk added successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'disk', type: 'string'),
                        new OA\Property(property: 'config_key', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'Proxmox update failed'),
        ]
    )]
    public function createDisk(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['storage']) || !isset($data['size_gb'])) {
            return ApiResponse::error('Request body must include "storage" and "size_gb"', 'VALIDATION_FAILED', 400);
        }
        $storage = (string) $data['storage'];
        $sizeGb = (int) $data['size_gb'];
        $path = isset($data['path']) ? trim((string) $data['path']) : '';
        if ($sizeGb < 1) {
            return ApiResponse::error('size_gb must be at least 1', 'VALIDATION_FAILED', 400);
        }

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }

        $result = $client->getVmConfig($node, (int) $instance['vmid'], $vmType);
        if (!$result['ok'] || !is_array($result['config'] ?? null)) {
            return ApiResponse::error('Failed to fetch config', 'PROXMOX_ERROR', 502);
        }
        $curConfig = $result['config'];

        if ($vmType === 'lxc') {
            $mpIndex = -1;
            foreach (array_keys($curConfig) as $k) {
                if (preg_match('/^mp(\d+)$/', (string) $k, $m)) {
                    $idx = (int) $m[1];
                    if ($idx > $mpIndex) {
                        $mpIndex = $idx;
                    }
                }
            }
            $nextKey = 'mp' . ($mpIndex + 1);
            $mpValue = $storage . ':' . $sizeGb;
            if ($path !== '') {
                $mpValue .= ',mp=' . $path;
            }
            $res = $client->setVmConfig($node, (int) $instance['vmid'], 'lxc', [$nextKey => $mpValue], []);
        } else {
            $diskIndex = -1;
            foreach (array_keys($curConfig) as $k) {
                if (preg_match('/^scsi(\d+)$/', (string) $k, $m)) {
                    $idx = (int) $m[1];
                    if ($idx > $diskIndex) {
                        $diskIndex = $idx;
                    }
                }
            }
            $nextKey = 'scsi' . ($diskIndex + 1);
            $diskValue = $storage . ':' . $sizeGb;
            $res = $client->setVmConfig($node, (int) $instance['vmid'], 'qemu', [$nextKey => $diskValue], []);
        }
        if (!$res['ok']) {
            return ApiResponse::error('Failed to add disk: ' . ($res['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
        }

        return ApiResponse::success(['disk' => $nextKey, 'config_key' => $nextKey], 'Disk added successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/vm-instances/{id}/disks/{key}',
        summary: 'Delete VM/container disk',
        description: 'DELETE LXC mount point or QEMU disk.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'key', in: 'path', required: true, schema: new OA\Schema(type: 'string', description: 'Disk key e.g. mp1')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Disk removed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'deleted', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'Proxmox update failed'),
        ]
    )]
    public function deleteDisk(Request $request, int $id, string $key): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }

        // Fetch current config so we can protect main OS disk and cloud-init drives.
        $cfg = $client->getVmConfig($node, (int) $instance['vmid'], $vmType);
        if (!$cfg['ok'] || !is_array($cfg['config'] ?? null)) {
            return ApiResponse::error('Failed to fetch config', 'PROXMOX_ERROR', 502);
        }
        /** @var array<string, mixed> $curConfig */
        $curConfig = $cfg['config'];

        $protectedKeys = [];
        if ($vmType === 'lxc') {
            $protectedKeys[] = 'rootfs';
        } else {
            if (array_key_exists('scsi0', $curConfig)) {
                $protectedKeys[] = 'scsi0';
            }
            foreach ($curConfig as $cfgKey => $value) {
                if (!is_string($cfgKey) || !preg_match('/^(scsi|virtio|sata|ide)\d+$/', $cfgKey)) {
                    continue;
                }
                $val = is_string($value) ? $value : '';
                if ($val !== '' && (str_contains($val, 'cloudinit') || str_contains($val, 'media=cdrom'))) {
                    $protectedKeys[] = $cfgKey;
                }
            }
        }
        $protectedKeys = array_values(array_unique($protectedKeys));

        if ($vmType === 'lxc') {
            if ($key === 'rootfs' || !preg_match('/^mp\d+$/', $key)) {
                return ApiResponse::error('Invalid disk key. Use mp0, mp1, ... (rootfs cannot be deleted)', 'INVALID_DISK', 400);
            }
        } else {
            if (!preg_match('/^(scsi|virtio|sata|ide)\d+$/', $key)) {
                return ApiResponse::error('Invalid disk key. Use scsi1, scsi2, virtio0, sata0, ...', 'INVALID_DISK', 400);
            }
        }
        if (in_array($key, $protectedKeys, true)) {
            return ApiResponse::error('This disk is protected (primary OS/cloud-init) and cannot be deleted', 'PROTECTED_DISK', 400);
        }

        if ($vmType === 'lxc') {
            $res = $client->setVmConfig($node, (int) $instance['vmid'], 'lxc', [], [$key]);
            if (!$res['ok']) {
                return ApiResponse::error('Failed to remove disk: ' . ($res['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
            }

            return ApiResponse::success(['deleted' => $key], 'Disk removed successfully', 200);
        }

        $volRef = null;
        if (isset($curConfig[$key]) && is_string($curConfig[$key])) {
            $parts = explode(',', $curConfig[$key]);
            $volRef = trim($parts[0]);
        }

        $unlink1 = $client->unlinkQemuDisks($node, (int) $instance['vmid'], [$key]);
        if (!$unlink1['ok']) {
            return ApiResponse::error('Failed to unlink disk: ' . ($unlink1['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
        }

        if ($volRef !== null && $volRef !== '') {
            $cfg2 = $client->getVmConfig($node, (int) $instance['vmid'], 'qemu');
            if ($cfg2['ok'] && is_array($cfg2['config'] ?? null)) {
                /** @var array<string, mixed> $cfgArr2 */
                $cfgArr2 = $cfg2['config'];
                $unusedKey = null;
                foreach ($cfgArr2 as $cfgKey => $value) {
                    if (!is_string($cfgKey) || !preg_match('/^unused\d+$/', $cfgKey)) {
                        continue;
                    }
                    $val = is_string($value) ? $value : '';
                    if ($val !== '' && str_starts_with($val, $volRef)) {
                        $unusedKey = $cfgKey;
                        break;
                    }
                }
                if ($unusedKey !== null) {
                    $unlink2 = $client->unlinkQemuDisks($node, (int) $instance['vmid'], [$unusedKey]);
                    if (!$unlink2['ok']) {
                        App::getInstance(true)->getLogger()->warning(
                            'Failed to destroy unused disk ' . $unusedKey . ' for VM ' . $instance['vmid'] . ': ' . ($unlink2['error'] ?? 'unknown')
                        );
                    }
                }
            }
        }

        return ApiResponse::success(['deleted' => $key], 'Disk removed successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/vm-instances/{id}/power',
        summary: 'Power action',
        description: 'Power action: start | stop | reboot.',
        tags: ['Admin - VM Instances'],
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
                        new OA\Property(property: 'instance', ref: '#/components/schemas/VmInstance'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error / Power failed'),
        ]
    )]
    public function power(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $action = $request->request->get('action') ?? $request->query->get('action');
        if ($action === null || $action === '') {
            $body = json_decode($request->getContent(), true);
            $action = is_array($body) && isset($body['action']) ? $body['action'] : null;
        }
        if (!in_array($action, ['start', 'stop', 'reboot'], true)) {
            return ApiResponse::error('Invalid action. Use start, stop, or reboot.', 'INVALID_ACTION', 400);
        }

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            if (!$find['ok']) {
                return ApiResponse::error('Could not determine Proxmox node for this VM', 'NODE_UNKNOWN', 500);
            }
            $node = $find['node'];
        }

        $vmid = (int) $instance['vmid'];
        $vmType = in_array($instance['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true) ? $instance['vm_type'] : 'qemu';

        $taskId = bin2hex(random_bytes(16));
        $meta = [
            'action'      => $action,
            'instance_id' => $id,
            'vm_type'     => $vmType,
        ];

        $saved = VmTask::create([
            'task_id'     => $taskId,
            'instance_id' => $id,
            'vm_node_id'  => (int) $instance['vm_node_id'],
            'task_type'   => 'power',
            'status'      => 'pending',
            'target_node' => $node,
            'vmid'        => $vmid,
            'data'        => $meta,
            'user_uuid'   => $admin['uuid'] ?? null,
        ]);

        if (!$saved) {
            return ApiResponse::error('Failed to create power task', 'DB_ERROR', 500);
        }

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id'     => (int) ($instance['vm_node_id'] ?? 0),
            'user_id'        => isset($admin['id']) ? (int) $admin['id'] : null,
            'event'          => 'vm:power.' . $action . '.scheduled',
            'metadata'       => ['hostname' => $instance['hostname'] ?? null, 'task_id' => $taskId],
            'ip'             => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'task_id' => $taskId,
            'message' => 'Power task added to queue.',
        ], 'Action scheduled', 202);
    }

    #[OA\Post(
        path: '/api/admin/vm-instances/{id}/reinstall',
        summary: 'Start async VM reinstall',
        description: 'Kicks off a full reinstall by cloning a fresh VM from the original template. Returns 202 with a reinstall_id immediately. Poll reinstall-status/{reinstallId} until status is active or failed.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 202,
                description: 'Reinstall clone started',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'reinstall_id', type: 'string'),
                        new OA\Property(property: 'message', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance or template not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function reinstall(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
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

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'vm_instance_reinstall_start',
            'context' => 'Started reinstall for VM instance: ' . ($instance['hostname'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'reinstall_id' => $result['reinstall_id'],
            'message'      => $result['message'],
        ], 'VM reinstall started', 202);
    }

    /**
     * GET /api/admin/vm-instances/reinstall-status/{reinstallId}
     * Poll until status = active | failed.
     */
    public function reinstallStatus(Request $request, string $reinstallId): Response
    {
        return $this->taskStatus($request, $reinstallId);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/{id}/backups',
        summary: 'List VM backups',
        description: 'List vzdump backups for a specific VM or container on its Proxmox node.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Backups listed',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'backups', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'backup_limit', type: 'integer'),
                        new OA\Property(property: 'storages', type: 'array', items: new OA\Items(type: 'string'), description: 'Available backup storages from Proxmox'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance or node not found'),
            new OA\Response(response: 500, description: 'Proxmox error'),
        ]
    )]
    public function listBackups(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $backups = VmInstanceBackup::getBackupsByInstanceId((int) $instance['id']);

        $storages = [];
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if ($vmNode) {
            try {
                $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
                $node = $instance['pve_node'] ?? '';
                if ($node === '') {
                    $find = $client->findNodeByVmid((int) $instance['vmid']);
                    $node = $find['ok'] ? $find['node'] : null;
                }
                if ($node !== null && $node !== '') {
                    $storagesRes = $client->getBackupStorages($node);
                    if ($storagesRes['ok'] && !empty($storagesRes['storages'])) {
                        $storages = $storagesRes['storages'];
                    }
                }
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->warning('Failed to fetch backup storages: ' . $e->getMessage());
            }
        }

        // Prefer node-level backup storage when it is available on this Proxmox node.
        if ($vmNode) {
            $preferred = isset($vmNode['storage_backups']) && is_string($vmNode['storage_backups']) ? trim($vmNode['storage_backups']) : '';
            if ($preferred !== '' && in_array($preferred, $storages, true)) {
                $storages = array_merge(
                    [$preferred],
                    array_values(array_filter($storages, static fn ($s) => $s !== $preferred)),
                );
            }
        }

        return ApiResponse::success([
            'backups'      => $backups,
            'backup_limit' => (int) ($instance['backup_limit'] ?? 5),
            'storages'     => $storages,
        ], 'Backups listed', 200);
    }

    #[OA\Post(
        path: '/api/admin/vm-instances/{id}/backups',
        summary: 'Create VM backup',
        description: 'Start an async vzdump backup for a VM or container. Returns 202 with backup_id; poll backup-status until done or failed.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'storage', type: 'string', nullable: true, description: 'Proxmox storage for the backup (optional, defaults to first backup-capable storage)'),
                    new OA\Property(property: 'compress', type: 'string', nullable: true, description: 'Compression method (zstd, lzo, gzip, 0)', default: 'zstd'),
                    new OA\Property(property: 'mode', type: 'string', nullable: true, description: 'Backup mode (snapshot, suspend, stop)', default: 'snapshot'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 202,
                description: 'Backup started',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'backup_id', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance or node not found'),
            new OA\Response(response: 422, description: 'Backup limit reached'),
            new OA\Response(response: 500, description: 'Proxmox error'),
        ]
    )]
    public function createBackup(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $data     = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }
        // Enforce node-level backup storage defaults; ignore any client-provided `storage` override.
        $storage  = '';
        $compress = is_string($data['compress'] ?? null) ? trim($data['compress']) : 'zstd';
        $mode     = is_string($data['mode'] ?? null) ? trim($data['mode']) : 'snapshot';
        $node     = $instance['pve_node'] ?? '';
        $vmid     = (int) $instance['vmid'];
        $vmType   = $instance['vm_type'] ?? 'qemu';

        if ($node === '') {
            $find = $client->findNodeByVmid($vmid);
            $node = $find['ok'] ? $find['node'] : '';
        }

        if ($storage === '') {
            $storagesRes = $client->getBackupStorages($node);
            if (!$storagesRes['ok'] || empty($storagesRes['storages'])) {
                return ApiResponse::error('No backup-capable storage found on node', 'NO_BACKUP_STORAGE', 400);
            }
            $preferred = isset($vmNode['storage_backups']) && is_string($vmNode['storage_backups']) ? trim($vmNode['storage_backups']) : '';
            if ($preferred !== '' && in_array($preferred, $storagesRes['storages'], true)) {
                $storage = $preferred;
            } else {
                $storage = $storagesRes['storages'][0];
            }
        }

        if ($storage === '') {
            return ApiResponse::error('No backup-capable storage selected', 'NO_BACKUP_STORAGE', 400);
        }

        $backupLimit = (int) ($instance['backup_limit'] ?? 5);
        $existingCount = VmInstanceBackup::countByInstanceId((int) $instance['id']);
        if ($existingCount >= $backupLimit) {
            return ApiResponse::error(
                'Backup limit reached (' . $backupLimit . '). Delete an existing backup first.',
                'BACKUP_LIMIT_REACHED',
                422
            );
        }

        if ($vmType === 'lxc' && $mode === 'snapshot') {
            $mode = 'suspend';
        }

        $result = $client->createVmBackup($node, $vmid, $storage, $compress, $mode);
        if (!$result['ok']) {
            return ApiResponse::error($result['error'] ?? 'Failed to create backup', 'PROXMOX_ERROR', 500);
        }
        $backupId = bin2hex(random_bytes(16));
        $vmNodeId = (int) ($instance['vm_node_id'] ?? 0);

        VmTask::create([
            'task_id'     => $backupId,
            'instance_id' => $id,
            'vm_node_id'  => $vmNodeId,
            'task_type'   => 'backup',
            'status'      => 'pending',
            'upid'        => $result['upid'],
            'target_node' => $node,
            'vmid'        => $vmid,
            'user_uuid'   => $instance['user_uuid'] ?? null,
            'data'        => [
                'type'        => 'backup',
                'instance_id' => $id,
                'vmid'        => $vmid,
                'node'        => $node,
                'storage'     => $storage,
            ],
        ]);

        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid'  => $admin['uuid'] ?? null,
            'name'       => 'vm_instance_backup_start',
            'context'    => 'Backup started for instance ID ' . $id . ' (vmid ' . $vmid . ')',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['backup_id' => $backupId], 'Backup started', 202);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/backup-status/{backupId}',
        summary: 'Poll VM backup status',
        description: 'Poll status of an async vzdump backup. Returns running, done, or failed.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'backupId', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Backup status',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', enum: ['running', 'done', 'failed']),
                        new OA\Property(property: 'error', type: 'string', nullable: true),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Missing or invalid backupId'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Backup task or instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function backupStatus(Request $request, string $backupId): Response
    {
        $task = VmTask::getByTaskId($backupId);
        if (!$task) {
            return ApiResponse::error('Backup task not found', 'NOT_FOUND', 404);
        }
        if (($task['task_type'] ?? '') !== 'backup') {
            return ApiResponse::error('Invalid backup task', 'INVALID_TASK', 400);
        }

        if ($task['status'] === 'pending' || $task['status'] === 'running') {
            return ApiResponse::success(['status' => 'running'], 'Backup in progress', 200);
        }

        if ($task['status'] === 'completed') {
            return ApiResponse::success(['status' => 'done'], 'Backup completed', 200);
        }

        return ApiResponse::success([
            'status' => 'failed',
            'error'  => $task['error'] ?? 'Unknown error',
        ], 'Backup failed', 200);
    }

    #[OA\Delete(
        path: '/api/admin/vm-instances/{id}/backups',
        summary: 'Delete VM backup',
        description: 'Delete a single vzdump backup volume belonging to a VM or container.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'volid', type: 'string', description: 'Proxmox backup volume ID'),
                    new OA\Property(property: 'storage', type: 'string', description: 'Proxmox storage name'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Backup deleted'),
            new OA\Response(response: 400, description: 'Missing volid or storage'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Backup does not belong to this VM'),
            new OA\Response(response: 404, description: 'VM instance or node not found'),
            new OA\Response(response: 500, description: 'Proxmox error'),
        ]
    )]
    public function deleteBackupVolume(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $data    = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }
        $volid   = is_string($data['volid'] ?? null) ? trim($data['volid']) : '';
        $storage = is_string($data['storage'] ?? null) ? trim($data['storage']) : '';

        if ($volid === '' || $storage === '') {
            return ApiResponse::error('volid and storage are required', 'MISSING_PARAMS', 400);
        }

        $backup = VmInstanceBackup::getByInstanceAndVolid((int) $instance['id'], $volid);
        if (!$backup) {
            return ApiResponse::error('This backup does not belong to this VM', 'FORBIDDEN', 403);
        }

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if ($vmNode) {
            try {
                $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
                $node   = $instance['pve_node'] ?? '';
                if ($node !== '') {
                    $result = $client->deleteBackupVolume($node, (string) $backup['storage'], (string) $backup['volid']);
                    if (!$result['ok']) {
                        return ApiResponse::error($result['error'] ?? 'Failed to delete backup', 'PROXMOX_ERROR', 500);
                    }
                }
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

                return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
            }
        }

        if (isset($backup['id']) && (int) $backup['id'] > 0) {
            VmInstanceBackup::deleteById((int) $backup['id']);
        }

        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid'  => $admin['uuid'] ?? null,
            'name'       => 'vm_instance_backup_delete',
            'context'    => 'Deleted backup ' . $volid . ' for instance ID ' . $id,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Backup deleted', 200);
    }

    #[OA\Post(
        path: '/api/admin/vm-instances/{id}/backups/restore',
        summary: 'Restore VM from backup',
        description: 'Start an async restore of a VM or container from a vzdump backup. Returns 202 with restore_id; poll restore-status until active or failed.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'volid', type: 'string', description: 'Proxmox backup volume ID'),
                    new OA\Property(property: 'storage', type: 'string', description: 'Proxmox storage name'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 202,
                description: 'Restore started',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'restore_id', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Missing volid or storage'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance or node not found'),
            new OA\Response(response: 500, description: 'Proxmox error'),
        ]
    )]
    public function restoreBackup(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $data    = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }
        $volid   = is_string($data['volid'] ?? null) ? trim($data['volid']) : '';
        $storage = is_string($data['storage'] ?? null) ? trim($data['storage']) : '';

        if ($volid === '' || $storage === '') {
            return ApiResponse::error('volid and storage are required', 'MISSING_PARAMS', 400);
        }

        $vmid   = (int) $instance['vmid'];
        $node   = $instance['pve_node'] ?? '';
        $vmType = $instance['vm_type'] ?? 'qemu';

        $stopResult = $client->stopVm($node, $vmid, $vmType);
        if (!$stopResult['ok']) {
            App::getInstance(true)->getLogger()->warning(
                'RestoreBackup: could not stop VM ' . $vmid . ' before restore: ' . ($stopResult['error'] ?? 'unknown')
            );
        }
        sleep(3);

        if ($vmType === 'qemu') {
            $result = $client->restoreQemuFromBackup($node, $vmid, $volid, $storage);
        } else {
            $result = $client->restoreLxcFromBackup($node, $vmid, $volid, $storage);
        }
        if (!$result['ok']) {
            return ApiResponse::error($result['error'] ?? 'Failed to start restore', 'PROXMOX_ERROR', 500);
        }

        $restoreId = bin2hex(random_bytes(16));
        $vmNodeId  = (int) ($instance['vm_node_id'] ?? 0);

        VmTask::create([
            'task_id'     => $restoreId,
            'instance_id' => $id,
            'vm_node_id'  => $vmNodeId,
            'task_type'   => 'restore_backup',
            'status'      => 'pending',
            'upid'        => $result['upid'],
            'target_node' => $node,
            'vmid'        => $vmid,
            'user_uuid'   => $instance['user_uuid'] ?? null,
            'data'        => [
                'type'        => 'restore_backup',
                'instance_id' => $id,
                'vmid'        => $vmid,
                'node'        => $node,
                'storage'     => $storage,
                'volid'       => $volid,
                'vm_type'     => $vmType,
            ],
        ]);

        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid'  => $admin['uuid'] ?? null,
            'name'       => 'vm_instance_restore_start',
            'context'    => 'Restore started for instance ID ' . $id . ' from ' . $volid,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['restore_id' => $restoreId], 'Restore started', 202);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/restore-status/{restoreId}',
        summary: 'Poll VM restore status',
        description: 'Poll status of an async restore from backup. Returns restoring, active, or failed.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'restoreId', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Restore status',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', enum: ['restoring', 'active', 'failed']),
                        new OA\Property(property: 'instance', ref: '#/components/schemas/VmInstance', nullable: true),
                        new OA\Property(property: 'error', type: 'string', nullable: true),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Missing or invalid restoreId'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Restore task or instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function restoreBackupStatus(Request $request, string $restoreId): Response
    {
        $task = VmTask::getByTaskId($restoreId);
        if (!$task) {
            return ApiResponse::error('Restore task not found', 'NOT_FOUND', 404);
        }
        if (($task['task_type'] ?? '') !== 'restore_backup') {
            return ApiResponse::error('Invalid restore task', 'INVALID_TASK', 400);
        }

        if ($task['status'] === 'pending' || $task['status'] === 'running') {
            return ApiResponse::success(['status' => 'restoring'], 'Restore in progress', 200);
        }

        if ($task['status'] === 'completed') {
            $instance = VmInstance::getById((int) $task['instance_id']);

            return ApiResponse::success(['status' => 'active', 'instance' => $instance], 'Restore completed', 200);
        }

        return ApiResponse::success([
            'status' => 'failed',
            'error'  => $task['error'] ?? 'Unknown error',
        ], 'Restore failed', 200);
    }

    #[OA\Patch(
        path: '/api/admin/vm-instances/{id}/backup-limit',
        summary: 'Set VM backup limit',
        description: 'Update the maximum number of backups allowed for a VM instance.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'limit', type: 'integer', description: 'Maximum number of backups (0–100)'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Backup limit updated',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'backup_limit', type: 'integer'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Invalid limit'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function setBackupLimit(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $data  = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }
        $limit = isset($data['limit']) && is_numeric($data['limit']) ? (int) $data['limit'] : null;
        if ($limit === null || $limit < 0 || $limit > 100) {
            return ApiResponse::error('limit must be an integer between 0 and 100', 'INVALID_LIMIT', 400);
        }

        try {
            $pdo  = Database::getPdoConnection();
            $stmt = $pdo->prepare('UPDATE featherpanel_vm_instances SET backup_limit = :limit WHERE id = :id');
            $stmt->execute(['limit' => $limit, 'id' => $id]);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to update backup limit', 'DB_ERROR', 500);
        }

        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid'  => $admin['uuid'] ?? null,
            'name'       => 'vm_instance_backup_limit_set',
            'context'    => 'Backup limit set to ' . $limit . ' for instance ID ' . $id,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['backup_limit' => $limit], 'Backup limit updated', 200);
    }

    #[OA\Post(
        path: '/api/admin/vm-instances/{id}/suspend',
        summary: 'Suspend VM instance',
        description: 'Suspend a VM instance by stopping it in Proxmox and updating the suspended status. Sends notification email to the VM owner.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'VM Instance ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM instance suspended successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to suspend VM'),
        ]
    )]
    public function suspend(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $ok = VmInstance::update($id, ['suspended' => 1]);
        if (!$ok) {
            return ApiResponse::error('Failed to suspend VM instance', 'FAILED_TO_SUSPEND', 500);
        }

        $config = App::getInstance(true)->getConfig();
        $user = null;
        if (!empty($instance['user_uuid'])) {
            $user = User::getUserByUuid($instance['user_uuid']);
        }

        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'vm_instance_suspend',
            'context' => 'Suspended VM instance ' . ($instance['hostname'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if ($vmNode) {
            try {
                $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
                $vmid = (int) $instance['vmid'];
                $vmType = in_array($instance['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true) ? $instance['vm_type'] : 'qemu';
                $node = $instance['pve_node'] ?? '';

                if ($vmType === 'qemu') {
                    $client->stopVm($node, $vmid, 'qemu');
                } else {
                    $client->stopVm($node, $vmid, 'lxc');
                }

                VmInstanceActivity::createActivity([
                    'vm_instance_id' => $id,
                    'vm_node_id'     => (int) ($instance['vm_node_id'] ?? 0),
                    'user_id'        => isset($admin['id']) ? (int) $admin['id'] : null,
                    'event'          => 'vm:suspended',
                    'metadata'       => ['hostname' => $instance['hostname'] ?? null],
                    'ip'             => CloudFlareRealIP::getRealIP(),
                ]);
            } catch (\Exception $e) {
                App::getInstance(true)->getLogger()->error('Failed to stop VM during suspension: ' . $e->getMessage());
            }
        }

        if ($user) {
            try {
                VmSuspended::send([
                    'email' => $user['email'],
                    'subject' => 'VM suspended on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                    'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                    'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'username' => $user['username'],
                    'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                    'uuid' => $user['uuid'],
                    'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                    'vm_hostname' => $instance['hostname'] ?? 'VM-' . $id,
                ]);
            } catch (\Exception $e) {
                App::getInstance(true)->getLogger()->error('Failed to send VM suspended email: ' . $e->getMessage());
            }
        }

        return ApiResponse::success([], 'VM instance suspended', 200);
    }

    #[OA\Post(
        path: '/api/admin/vm-instances/{id}/unsuspend',
        summary: 'Unsuspend VM instance',
        description: 'Unsuspend a VM instance by updating the suspended status. Sends notification email to the VM owner.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'VM Instance ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM instance unsuspended successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to unsuspend VM'),
        ]
    )]
    public function unsuspend(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $ok = VmInstance::update($id, ['suspended' => 0]);
        if (!$ok) {
            return ApiResponse::error('Failed to unsuspend VM instance', 'FAILED_TO_UNSUSPEND', 500);
        }

        $config = App::getInstance(true)->getConfig();
        $user = null;
        if (!empty($instance['user_uuid'])) {
            $user = User::getUserByUuid($instance['user_uuid']);
        }

        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'vm_instance_unsuspend',
            'context' => 'Unsuspended VM instance ' . ($instance['hostname'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id'     => (int) ($instance['vm_node_id'] ?? 0),
            'user_id'        => isset($admin['id']) ? (int) $admin['id'] : null,
            'event'          => 'vm:unsuspended',
            'metadata'       => ['hostname' => $instance['hostname'] ?? null],
            'ip'             => CloudFlareRealIP::getRealIP(),
        ]);

        if ($user) {
            try {
                VmUnsuspended::send([
                    'email' => $user['email'],
                    'subject' => 'VM unsuspended on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                    'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                    'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'username' => $user['username'],
                    'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                    'uuid' => $user['uuid'],
                    'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                    'vm_hostname' => $instance['hostname'] ?? 'VM-' . $id,
                ]);
            } catch (\Exception $e) {
                App::getInstance(true)->getLogger()->error('Failed to send VM unsuspended email: ' . $e->getMessage());
            }
        }

        return ApiResponse::success([], 'VM instance unsuspended', 200);
    }

    #[OA\Delete(
        path: '/api/admin/vm-instances/{id}',
        summary: 'Delete VM instance',
        description: 'Delete VM instance: stop on Proxmox (if running), delete from Proxmox, then remove from DB.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'VM instance deleted successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            VmInstanceUtil::deleteInstanceBackups($instance, null);
            VmInstance::delete($id);
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'vm_instance_delete',
                'context' => 'Deleted VM instance record (node gone): ' . ($instance['hostname'] ?? $id),
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success([], 'VM instance deleted', 200);
        }

        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            VmInstanceUtil::deleteInstanceBackups($instance, null);
            VmInstance::delete($id);
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'vm_instance_delete',
                'context' => 'Deleted VM instance (Proxmox unreachable): ' . ($instance['hostname'] ?? $id),
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success([], 'VM instance deleted from panel', 200);
        }

        $vmid = (int) $instance['vmid'];
        $vmType = in_array($instance['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true) ? $instance['vm_type'] : 'qemu';

        VmInstance::updateStatus($id, 'deleting');
        $taskId = bin2hex(random_bytes(16));
        VmTask::create([
            'task_id'     => $taskId,
            'instance_id' => $id,
            'vm_node_id'  => (int) $instance['vm_node_id'],
            'task_type'   => 'delete',
            'status'      => 'pending',
            'target_node' => $instance['pve_node'] ?? '',
            'vmid'        => $vmid,
            'user_uuid'   => $admin['uuid'] ?? null,
            'data'        => [
                'type'        => 'delete',
                'instance_id' => $id,
                'vmid'        => $vmid,
                'vm_type'     => $vmType,
                'node'        => $instance['pve_node'] ?? '',
                'current_step' => 'initial',
            ],
        ]);

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id'     => (int) ($instance['vm_node_id'] ?? 0),
            'user_id'        => isset($admin['id']) ? (int) $admin['id'] : null,
            'event'          => 'vm:delete.queued',
            'metadata'       => ['hostname' => $instance['hostname'] ?? null, 'task_id' => $taskId],
            'ip'             => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['task_id' => $taskId], 'VM deletion task added to queue', 202);
    }

    public function taskStatus(Request $request, string $taskId): Response
    {
        $taskId = trim($taskId);
        if ($taskId === '') {
            return ApiResponse::error('Missing task_id', 'INVALID_ID', 400);
        }

        $task = VmTask::getByTaskId($taskId);
        if (!$task) {
            return ApiResponse::error('Task not found', 'NOT_FOUND', 404);
        }

        $type = $task['task_type'] ?? 'unknown';
        $status = $task['status'] ?? 'pending';

        if ($status === 'pending' || $status === 'running') {
            $msg = match ($type) {
                'delete'    => 'Deletion in progress…',
                'power'     => 'Power action in progress…',
                'reinstall' => 'Cloning and provisioning VM…',
                'create'    => 'Provisioning new VM…',
                default     => 'Processing task…',
            };

            if ($status === 'pending') {
                $msg = 'Task in queue, waiting for processing…';
            }

            return ApiResponse::success([
                'status'  => $status,
                'message' => $msg,
            ], 'In progress', 200);
        }

        if ($status === 'completed') {
            return ApiResponse::success([
                'status' => 'completed',
            ], 'Task completed successfully', 200);
        }

        return ApiResponse::success([
            'status' => 'failed',
            'error'  => $task['error'] ?? 'Unknown error',
        ], 'Task failed', 200);
    }

    public function deleteStatus(Request $request, string $taskId): Response
    {
        return $this->taskStatus($request, $taskId);
    }

    /**
     * Sanitize a hostname for Proxmox (valid DNS label: a-z, 0-9, hyphen; max 63 chars).
     * Proxmox returns 400 "invalid format - value does not look like a valid DNS name" otherwise.
     */
    private static function sanitizeHostnameForProxmox(?string $value): string
    {
        if ($value === null || $value === '') {
            return 'vm-' . time();
        }
        $s = strtolower(trim($value));
        $s = preg_replace('/[^a-z0-9\-]/', '-', $s);
        $s = preg_replace('/-+/', '-', $s);
        $s = trim($s, '-');
        if ($s === '') {
            return 'vm-' . time();
        }
        if (strlen($s) > 63) {
            $s = substr($s, 0, 63);
            $s = rtrim($s, '-');
        }

        return $s !== '' ? $s : 'vm-' . time();
    }
}
