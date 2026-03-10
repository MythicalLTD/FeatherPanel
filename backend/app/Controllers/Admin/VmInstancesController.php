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
use App\Chat\VmIp;
use App\Chat\VmNode;
use App\Chat\Activity;
use App\Chat\Database;
use App\Chat\VmInstance;
use App\Chat\VmTemplate;
use App\Helpers\ApiResponse;
use App\Chat\VmCreationPending;
use App\Config\ConfigInterface;
use App\Services\Proxmox\Proxmox;
use App\CloudFlare\CloudFlareRealIP;
use OpenApi\Attributes as OA;
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
        new OA\Property(property: 'ci_user', type: 'string', nullable: true, description: 'Cloud-init user (required for KVM)'),
        new OA\Property(property: 'ci_password', type: 'string', nullable: true, description: 'Cloud-init password (required for KVM)'),
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
            new OA\Parameter(name: 'search', in: 'query', description: 'Search term', required: false, schema: new OA\Schema(type: 'string'))
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
                return ApiResponse::error('Cloud-init user (ci_user) is required for KVM templates', 'VALIDATION_FAILED', 400);
            }
            if ($ciPasswordInput === null || $ciPasswordInput === '') {
                return ApiResponse::error('Cloud-init password (ci_password) is required for KVM templates', 'VALIDATION_FAILED', 400);
            }
        }
        $metaNotes = [
            'notes' => $notesRaw,
            'ci_user' => $ciUserInput,
            'ci_password' => $ciPasswordInput,
        ];
        $notes = json_encode($metaNotes, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
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

        $nextResult = $client->getNextVmid(100);
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
        if ($vmType === 'qemu') {
            $cloneResult = $client->cloneQemu($templateNode, $templateVmid, $vmid, $hostname, $targetNode);
        } else {
            $cloneResult = $client->cloneLxc($templateNode, $templateVmid, $vmid, $hostname, $targetNode, $storage);
        }
        if (!$cloneResult['ok']) {
            return ApiResponse::error(
                'Clone failed: ' . ($cloneResult['error'] ?? 'unknown'),
                'CLONE_FAILED',
                500
            );
        }

        $creationId = bin2hex(random_bytes(16));
        $saved = VmCreationPending::create([
            'creation_id'  => $creationId,
            'upid'         => $cloneResult['upid'],
            'target_node'  => $targetNode,
            'vmid'         => $vmid,
            'hostname'     => $hostname,
            'vm_node_id'   => $vmNodeId,
            'plan_id'      => null,
            'template_id'  => $templateId,
            'vm_ip_id'     => $vmIpId,
            'user_uuid'    => $userUuid,
            'notes'        => $notes,
            'vm_type'      => $vmType,
            'memory'       => $memory,
            'cpus'         => $cpus,
            'cores'        => $cores,
            'disk'         => $disk,
            'storage'      => $storage,
            'bridge'       => $bridge,
            'on_boot'      => $onBoot,
        ]);
        if (!$saved) {
            return ApiResponse::error('Failed to save creation pending record', 'DB_ERROR', 500);
        }

        return ApiResponse::success([
            'creation_id' => $creationId,
            'message'    => 'VM clone started. Poll creation-status until active or failed.',
        ], 'VM creation started', 202);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/creation-status/{creationId}',
        summary: 'Poll VM creation status',
        description: 'Poll status of an async VM creation. Returns status cloning, active, or failed.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'creationId', in: 'path', required: true, schema: new OA\Schema(type: 'string'))
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

        $pending = VmCreationPending::getByCreationId($creationId);
        if (!$pending) {
            return ApiResponse::error('Creation not found or already completed', 'NOT_FOUND', 404);
        }

        // Unpack notes/ci metadata (we JSON-encode notes + ci_user + ci_password into notes column).
        $rawNotes = $pending['notes'] ?? null;
        $ciUserFromPending = null;
        $ciPasswordFromPending = null;
        $userNotesForInstance = $rawNotes;
        if (is_string($rawNotes) && $rawNotes !== '' && $rawNotes[0] === '{') {
            $decoded = json_decode($rawNotes, true);
            if (is_array($decoded)) {
                $userNotesForInstance = isset($decoded['notes']) && is_string($decoded['notes']) ? $decoded['notes'] : null;
                $ciUserFromPending = isset($decoded['ci_user']) && is_string($decoded['ci_user']) ? trim($decoded['ci_user']) : null;
                $ciPasswordFromPending = isset($decoded['ci_password']) && is_string($decoded['ci_password']) ? trim($decoded['ci_password']) : null;
            }
        }

        $vmNode = VmNode::getVmNodeById((int) $pending['vm_node_id']);
        if (!$vmNode) {
            VmCreationPending::deleteByCreationId($creationId);

            return ApiResponse::error('VM node not found', 'NODE_NOT_FOUND', 500);
        }

        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $taskResult = $client->getTaskStatus($pending['target_node'], $pending['upid']);
        if (!$taskResult['ok']) {
            return ApiResponse::success([
                'status' => 'cloning',
                'message' => 'Checking clone progress…',
            ], 'Checking clone progress…', 200);
        }

        if ($taskResult['status'] !== 'stopped') {
            return ApiResponse::success([
                'status' => 'cloning',
                'message' => 'Clone in progress…',
            ], 'Clone in progress…', 200);
        }

        if (($taskResult['exitstatus'] ?? '') !== 'OK') {
            $errMsg = $taskResult['error'] ?? ('Exit status: ' . ($taskResult['exitstatus'] ?? 'unknown'));
            $client->deleteVm($pending['target_node'], (int) $pending['vmid'], $pending['vm_type'] === 'lxc' ? 'lxc' : 'qemu');
            VmCreationPending::deleteByCreationId($creationId);

            return ApiResponse::success([
                'status' => 'failed',
                'error'  => $errMsg,
            ], 'Clone failed', 200);
        }

        $ip = $pending['vm_ip_id'] ? VmIp::getById((int) $pending['vm_ip_id']) : null;
        if (!$ip) {
            $client->deleteVm($pending['target_node'], (int) $pending['vmid'], $pending['vm_type'] === 'lxc' ? 'lxc' : 'qemu');
            VmCreationPending::deleteByCreationId($creationId);

            return ApiResponse::success([
                'status' => 'failed',
                'error'  => 'IP no longer available',
            ], 'IP no longer available', 200);
        }

        $cidr = isset($ip['cidr']) && $ip['cidr'] !== null ? (int) $ip['cidr'] : 24;
        $gateway = $ip['gateway'] ?? '';
        $bridge = !empty($pending['bridge']) ? (string) $pending['bridge'] : 'vmbr0';
        $vmType = $pending['vm_type'] === 'lxc' ? 'lxc' : 'qemu';
        $memory = (int) ($pending['memory'] ?? 512);
        $cpus = (int) ($pending['cpus'] ?? 1);
        $cores = (int) ($pending['cores'] ?? 1);
        $onBoot = !empty($pending['on_boot']);

        // Final cloud-init credentials for KVM branch; used later in response.
        $finalCiUser = null;
        $finalCiPassword = null;

        // If this is a QEMU VM and requested disk size is larger than the current disk,
        // grow scsi0 to the desired size (in GB) at Proxmox level. Never try to shrink.
        if ($vmType === 'qemu') {
            $requestedDiskGb = isset($pending['disk']) ? (int) $pending['disk'] : 0;
            if ($requestedDiskGb > 0) {
                $currentSizeGb = null;
                $currentConfig = $client->getVmConfig($pending['target_node'], (int) $pending['vmid'], 'qemu');
                if ($currentConfig['ok'] && isset($currentConfig['config']['scsi0']) && is_string($currentConfig['config']['scsi0'])) {
                    $scsi0 = $currentConfig['config']['scsi0'];
                    $parts = explode(',', $scsi0);
                    foreach ($parts as $part) {
                        $part = trim($part);
                        if (str_starts_with($part, 'size=')) {
                            $sizeVal = substr($part, 5);
                            // Common Proxmox format: "32G"
                            if (preg_match('/^(\d+)([GgMm])?$/', $sizeVal, $m)) {
                                $num = (int) $m[1];
                                $unit = isset($m[2]) ? strtolower($m[2]) : 'g';
                                $currentSizeGb = $unit === 'm' ? (int) ceil($num / 1024) : $num;
                            }
                            break;
                        }
                    }
                }

                if ($currentSizeGb !== null && $requestedDiskGb > $currentSizeGb) {
                    $resizeRes = $client->resizeQemuDisk($pending['target_node'], (int) $pending['vmid'], 'scsi0', $requestedDiskGb . 'G');
                    if (!$resizeRes['ok']) {
                        App::getInstance(true)->getLogger()->warning('QEMU disk resize failed (continuing): ' . ($resizeRes['error'] ?? 'unknown'));
                    }
                }
            }
        }

        if ($vmType === 'lxc') {
            // Purge any network config from the clone (template IP), then set our own in two steps so LXC gets the right IP
            $deleteNetKeys = [];
            $getConfig = $client->getVmConfig($pending['target_node'], (int) $pending['vmid'], 'lxc');
            if ($getConfig['ok'] && is_array($getConfig['config'])) {
                foreach (array_keys($getConfig['config']) as $key) {
                    if (preg_match('/^net\d+$/', $key)) {
                        $deleteNetKeys[] = $key;
                    }
                }
            }
            if (!empty($deleteNetKeys)) {
                $delResult = $client->setVmConfig(
                    $pending['target_node'],
                    (int) $pending['vmid'],
                    'lxc',
                    [],
                    $deleteNetKeys,
                );
                if (!$delResult['ok']) {
                    App::getInstance(true)->getLogger()->warning('LXC network purge failed: ' . ($delResult['error'] ?? ''));
                }
            }
            $net0 = 'name=eth0,bridge=' . $bridge . ',ip=' . $ip['ip'] . '/' . $cidr;
            if ($gateway !== '') {
                $net0 .= ',gw=' . $gateway;
            }
            $config = [
                'memory' => $memory,
                'cores' => $cpus * $cores,
                'nameserver' => '1.1.1.1 8.8.8.8',
                'net0' => $net0,
                'onboot' => $onBoot ? 1 : 0,
            ];
            $configResult = $client->setVmConfig(
                $pending['target_node'],
                (int) $pending['vmid'],
                'lxc',
                $config,
                [],
            );
            if (!$configResult['ok']) {
                App::getInstance(true)->getLogger()->warning('LXC config update failed (continuing): ' . ($configResult['error'] ?? ''));
            }
        } else {
            $ipconfig0 = 'ip=' . $ip['ip'] . '/' . $cidr;
            if ($gateway !== '') {
                $ipconfig0 .= ',gw=' . $gateway;
            }

            // Use ci_user/ci_password from pending if provided, otherwise sane defaults.
            $finalCiUser = $ciUserFromPending ?: 'debian';
            $finalCiPassword = $ciPasswordFromPending ?: bin2hex(random_bytes(6));

            $config = [
                'memory' => $memory,
                'sockets' => $cpus,
                'cores' => $cores,
                'nameserver' => '1.1.1.1 8.8.8.8',
                'ipconfig0' => $ipconfig0,
                'onboot' => $onBoot ? 1 : 0,
                // Ensure the VM actually boots from the cloud image on scsi0, not from the (empty) cloud-init CD or net.
                'boot' => 'order=scsi0',
                // Cloud-init user and password so admins can log in immediately.
                'ciuser' => $finalCiUser,
                'cipassword' => $finalCiPassword,
            ];
            $configResult = $client->setVmConfig($pending['target_node'], (int) $pending['vmid'], 'qemu', $config);
            if (!$configResult['ok']) {
                App::getInstance(true)->getLogger()->warning('VM config update failed (continuing): ' . ($configResult['error'] ?? ''));
            }
        }

        $pdo = Database::getPdoConnection();
        $pdo->beginTransaction();
        try {
            $instanceData = [
                'vmid' => (int) $pending['vmid'],
                'vm_node_id' => (int) $pending['vm_node_id'],
                'user_uuid' => $pending['user_uuid'],
                'pve_node' => $pending['target_node'],
                'plan_id' => isset($pending['plan_id']) && $pending['plan_id'] > 0 ? (int) $pending['plan_id'] : null,
                'template_id' => $pending['template_id'] ? (int) $pending['template_id'] : null,
                'vm_type' => $vmType,
                'hostname' => $pending['hostname'],
                'status' => 'stopped',
                'ip_address' => $ip['ip'],
                'subnet_mask' => null,
                'gateway' => $ip['gateway'] ?? null,
                'vm_ip_id' => $pending['vm_ip_id'] ? (int) $pending['vm_ip_id'] : null,
                'notes' => $userNotesForInstance,
            ];
            $instance = VmInstance::create($instanceData, $pdo);
            if (!$instance) {
                $pdo->rollBack();
                $client->deleteVm($pending['target_node'], (int) $pending['vmid'], $vmType);
                VmCreationPending::deleteByCreationId($creationId);

                return ApiResponse::success([
                    'status' => 'failed',
                    'error'  => 'Failed to save VM instance record',
                ], 'Failed to save VM instance record', 200);
            }
            if ($onBoot) {
                $startResult = $client->startVm($pending['target_node'], (int) $pending['vmid'], $vmType);
                if ($startResult['ok']) {
                    VmInstance::updateStatus((int) $instance['id'], 'running', $pdo);
                }
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            App::getInstance(true)->getLogger()->error('VM creation finish failed: ' . $e->getMessage());
            $client->deleteVm($pending['target_node'], (int) $pending['vmid'], $vmType);
            VmCreationPending::deleteByCreationId($creationId);

            return ApiResponse::success([
                'status' => 'failed',
                'error'  => $e->getMessage(),
            ], 'Creation failed', 200);
        }

        VmCreationPending::deleteByCreationId($creationId);

        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'vm_instance_create',
            'context' => 'Created VM instance: ' . $pending['hostname'] . ' (vmid ' . $pending['vmid'] . ')',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        $instance = VmInstance::getById((int) $instance['id']);

        return ApiResponse::success([
            'status'   => 'active',
            'instance' => $instance,
            // Expose cloud-init login for KVM-based VMs so the creator can see it once.
            'ci_user' => $vmType === 'lxc' ? null : $finalCiUser,
            'ci_password' => $vmType === 'lxc' ? null : $finalCiPassword,
        ], 'VM instance created successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/{id}',
        summary: 'Get VM instance',
        description: 'Get a single VM instance by ID.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
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

        return ApiResponse::success(['instance' => $instance], 'VM instance fetched successfully', 200);
    }

    #[OA\Patch(
        path: '/api/admin/vm-instances/{id}',
        summary: 'Update VM instance',
        description: 'Update instance: hostname, notes, user_uuid, vm_ip_id, memory, cpus, cores, on_boot, networks.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
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
        $proxmoxKeys = ['memory', 'cpus', 'cores', 'on_boot', 'vm_ip_id'];
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
                $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
                $client = new Proxmox(
                    $vmNode['fqdn'],
                    (int) $vmNode['port'],
                    $vmNode['scheme'],
                    $vmNode['user'],
                    $vmNode['token_id'],
                    $vmNode['secret'],
                    $tlsNoVerify,
                    (int) ($vmNode['timeout'] ?? 60),
                );
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
            }
            if ($onBoot !== null) {
                $config['onboot'] = $onBoot ? 1 : 0;
            }
            if ($vmType === 'lxc' && $networks === null) {
                if ($cpus !== null && $cores !== null) {
                    $config['cores'] = $cpus * $cores;
                } elseif ($cores !== null) {
                    $config['cores'] = $cores;
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
                }
                if ($cores !== null) {
                    $config['cores'] = $cores;
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

        return ApiResponse::success(['instance' => VmInstance::getById($id)], 'VM instance updated successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/{id}/config',
        summary: 'Get VM instance config',
        description: 'GET Proxmox config for this instance.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
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
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
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
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
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
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
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
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
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
        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
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
        $vnc = $client->createVncProxy($node, (int) $instance['vmid'], $vmType);
        if (!$vnc['ok'] || $vnc['ticket'] === null || $vnc['port'] === null) {
            return ApiResponse::error('VNC proxy failed: ' . ($vnc['error'] ?? 'unknown'), 'VNC_PROXY_FAILED', 502);
        }
        $wssPath = sprintf('/api2/json/nodes/%s/%s/%d/vncwebsocket', $node, $vmType, (int) $instance['vmid']);
        $wssQuery = 'port=' . $vnc['port'] . '&vncticket=' . rawurlencode($vnc['ticket']);
        $host = $vmNode['fqdn'] ?? '';
        $portApi = (int) ($vmNode['port'] ?? 8006);

        $config = App::getInstance(true)->getConfig();
        $usePanelProxy = $config->getSetting(ConfigInterface::VNC_PROXY_VIA_PANEL, 'false') === 'true';
        if ($usePanelProxy) {
            $appUrl = rtrim($config->getSetting(ConfigInterface::APP_URL, ''), '/');
            if ($appUrl !== '') {
                $panelScheme = (str_starts_with($appUrl, 'https:')) ? 'wss' : 'ws';
                $panelHost = parse_url($appUrl, PHP_URL_HOST);
                $panelPort = parse_url($appUrl, PHP_URL_PORT);
                $wssUrl = $panelScheme . '://' . $panelHost . ($panelPort ? ':' . $panelPort : '') . '/vnc-proxy' . $wssPath . '?' . $wssQuery;
            } else {
                $usePanelProxy = false;
            }
        }
        if (!$usePanelProxy) {
            $scheme = ($vmNode['scheme'] ?? 'https') === 'https' ? 'wss' : 'ws';
            $wssPort = $portApi > 0 ? $portApi : 8006;
            $wssUrl = $scheme . '://' . $host . ':' . $wssPort . $wssPath . '?' . $wssQuery;
        }

        $payload = [
            'ticket' => $vnc['ticket'],
            'port' => $vnc['port'],
            'node' => $node,
            'vmid' => (int) $instance['vmid'],
            'host' => $host,
            'port_api' => $portApi,
            'wss_url' => $wssUrl,
        ];

        // Always try Proxmox noVNC redirect (temp user + ticket) so the popup opens on the Proxmox host, not the panel.
        // If createUser/ACL/ticket fails (e.g. permissions), we fall back to wss_url (panel vnc_lite.html).
        $tempUser = 'fp-console-' . $id . '-' . bin2hex(random_bytes(4)) . '@pve';
        $tempPass = bin2hex(random_bytes(16));
        $expire = time() + 300; // 5 minutes
        $cr = $client->createUser($tempUser, $tempPass, $expire);
        if ($cr['ok']) {
            // Proxmox valid ACL path for VMs/containers is /vms/{vmid} (not /nodes/.../qemu|lcx/...).
            $aclPath = '/vms/' . (int) $instance['vmid'];
            $ar = $client->addAcl($aclPath, 'PVEVMUser', $tempUser);
            if ($ar['ok']) {
                $ticketResult = $client->getTicketWithPassword($tempUser, $tempPass);
                if ($ticketResult['ok'] && $ticketResult['ticket'] !== null) {
                    $scheme = ($vmNode['scheme'] ?? 'https') === 'https' ? 'https' : 'http';
                    $pvePort = $portApi > 0 ? $portApi : 8006;
                    $consoleType = $vmType === 'qemu' ? 'kvm' : 'lxc';
                    $payload['pve_redirect_url'] = $scheme . '://' . $host . ':' . $pvePort . '/novnc/mgnovnc.html?novnc=1&token=' . rawurlencode($ticketResult['ticket'])
                        . '&vmid=' . (int) $instance['vmid'] . '&node=' . rawurlencode($node) . '&console=' . $consoleType;
                    // Do not delete the user here: Proxmox validates the ticket against the user when noVNC loads, so deleting causes 401. User has expire=5min so Proxmox will purge them.
                }
            }
        }

        return ApiResponse::success($payload, 'VNC ticket created (valid ~40s)', 200);
    }

    #[OA\Get(
        path: '/api/admin/vm-instances/{id}/activities',
        summary: 'Get VM instance activities',
        description: 'GET activity/task history for this VM instance.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'limit', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 50))
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
        summary: 'Resize LXC disk',
        description: 'Resize LXC disk. Body must include "disk" and "size".',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
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
        if (($instance['vm_type'] ?? 'qemu') !== 'lxc') {
            return ApiResponse::error('Disk resize is only supported for LXC containers', 'NOT_LXC', 400);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['disk']) || empty($data['size'])) {
            return ApiResponse::error('Request body must include "disk" and "size" (e.g. disk: "rootfs", size: "+5G")', 'VALIDATION_FAILED', 400);
        }
        $disk = (string) $data['disk'];
        $size = (string) $data['size'];
        if (!preg_match('/^(rootfs|mp\d+)$/', $disk)) {
            return ApiResponse::error('Invalid disk. Use rootfs or mp0, mp1, ...', 'INVALID_DISK', 400);
        }
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
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
        $res = $client->resizeContainerDisk($node, (int) $instance['vmid'], $disk, $size);
        if (!$res['ok']) {
            return ApiResponse::error('Resize failed: ' . ($res['error'] ?? 'unknown'), 'RESIZE_FAILED', 502);
        }

        return ApiResponse::success(['message' => 'Disk resized'], 'Disk resized successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/vm-instances/{id}/disks',
        summary: 'Create LXC disk',
        description: 'POST add LXC mount point.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
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
        if (($instance['vm_type'] ?? 'qemu') !== 'lxc') {
            return ApiResponse::error('Add disk is only supported for LXC containers', 'NOT_LXC', 400);
        }
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
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
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

        $result = $client->getVmConfig($node, (int) $instance['vmid'], 'lxc');
        if (!$result['ok'] || !is_array($result['config'] ?? null)) {
            return ApiResponse::error('Failed to fetch config', 'PROXMOX_ERROR', 502);
        }
        $curConfig = $result['config'];
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
        if (!$res['ok']) {
            return ApiResponse::error('Failed to add disk: ' . ($res['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
        }

        return ApiResponse::success(['disk' => $nextKey, 'config_key' => $nextKey], 'Disk added successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/vm-instances/{id}/disks/{key}',
        summary: 'Delete LXC disk',
        description: 'DELETE LXC mount point.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'key', in: 'path', required: true, schema: new OA\Schema(type: 'string', description: 'Disk key e.g. mp1'))
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
        if (($instance['vm_type'] ?? 'qemu') !== 'lxc') {
            return ApiResponse::error('Delete disk is only supported for LXC containers', 'NOT_LXC', 400);
        }
        if ($key === 'rootfs' || !preg_match('/^mp\d+$/', $key)) {
            return ApiResponse::error('Invalid disk key. Use mp0, mp1, ... (rootfs cannot be deleted)', 'INVALID_DISK', 400);
        }

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
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

        $res = $client->setVmConfig($node, (int) $instance['vmid'], 'lxc', [], [$key]);
        if (!$res['ok']) {
            return ApiResponse::error('Failed to remove disk: ' . ($res['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
        }

        return ApiResponse::success(['deleted' => $key], 'Disk removed successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/vm-instances/{id}/power',
        summary: 'Power action',
        description: 'Power action: start | stop | reboot.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
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
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
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

        $instance = VmInstance::getById($id);

        return ApiResponse::success(['instance' => $instance], 'Power action completed', 200);
    }

    #[OA\Delete(
        path: '/api/admin/vm-instances/{id}',
        summary: 'Delete VM instance',
        description: 'Delete VM instance: stop on Proxmox (if running), delete from Proxmox, then remove from DB.',
        tags: ['Admin - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
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
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
        } catch (\Throwable $e) {
            VmInstance::delete($id);
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'vm_instance_delete',
                'context' => 'Deleted VM instance (Proxmox unreachable): ' . ($instance['hostname'] ?? $id),
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success([], 'VM instance deleted from panel', 200);
        }

        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node !== null && $node !== '') {
            $vmType = in_array($instance['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true) ? $instance['vm_type'] : 'qemu';
            $client->stopVm($node, (int) $instance['vmid'], $vmType);
            sleep(2);
            $client->deleteVm($node, (int) $instance['vmid'], $vmType);
        }

        VmInstance::delete($id);
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'vm_instance_delete',
            'context' => 'Deleted VM instance: ' . ($instance['hostname'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'VM instance deleted successfully', 200);
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
