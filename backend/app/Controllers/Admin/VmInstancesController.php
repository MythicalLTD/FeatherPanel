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
use OpenApi\Attributes as OA;
use App\Chat\VmInstanceBackup;
use App\Chat\VmCreationPending;
use App\Chat\VmInstanceActivity;
use App\Services\Proxmox\Proxmox;
use App\Services\Vm\VmInstanceUtil;
use App\CloudFlare\CloudFlareRealIP;
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
            'backup_limit' => $backupLimit,
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
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
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

        // Final cloud-init credentials for KVM branch; used later in response. (MAGIC): IK what you are thinking but trust me. This is how it works. Don't touch it.
        $finalCiUser = null;
        $finalCiPassword = null;

        // If this is a QEMU VM and requested disk size is larger than the current disk, WE could argue that it's a good idea to grow the disk size at Proxmox level. But don't touch it.
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
                    } elseif (is_string($resizeRes['upid'] ?? null) && $resizeRes['upid'] !== '') {
                        $wait = $client->waitTask($pending['target_node'], (string) $resizeRes['upid'], 600, 5);
                        if (!$wait['ok']) {
                            App::getInstance(true)->getLogger()->warning('QEMU disk resize task failed: ' . ($wait['error'] ?? 'unknown'));
                        }
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

            // Build description with detailed info for Proxmox notes ti help idiots identify the VM. 
            $descParts = ['FeatherPanel Managed VM'];
            if (!empty($ip['ip'])) {
                $descParts[] = 'IP: ' . $ip['ip'];
            }
            if (!empty($pending['hostname'])) {
                $descParts[] = 'Hostname: ' . $pending['hostname'];
            }
            if (!empty($pending['user_uuid'])) {
                $descParts[] = 'User: ' . $pending['user_uuid'];
            }
            $descParts[] = 'Created: ' . date('Y-m-d H:i:s');

            $config = [
                'memory' => $memory,
                'cores' => $cpus * $cores,
                'nameserver' => '1.1.1.1 8.8.8.8',
                'net0' => $net0,
                'onboot' => $onBoot ? 1 : 0,
                'tags' => 'FeatherPanel-Managed',
                'description' => implode(' | ', $descParts),
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

            // If requested disk size is larger than current LXC rootfs, grow it to the desired size (GB). Else you will face the issue with vms not creating :))
			// Ask me how i know this. (4 hours of my life wasted)
            $requestedDiskGb = isset($pending['disk']) ? (int) $pending['disk'] : 0;
            if ($requestedDiskGb > 0 && $getConfig['ok'] && isset($getConfig['config']['rootfs']) && is_string($getConfig['config']['rootfs'])) {
                $rootfs = $getConfig['config']['rootfs'];
                $parts = explode(',', $rootfs);
                $currentSizeGb = null;
                foreach ($parts as $part) {
                    $part = trim($part);
                    if (str_starts_with($part, 'size=')) {
                        $sizeVal = substr($part, 5);
                        if (preg_match('/^(\d+)([GgMm])?$/', $sizeVal, $m)) {
                            $num = (int) $m[1];
                            $unit = isset($m[2]) ? strtolower($m[2]) : 'g';
                            $currentSizeGb = $unit === 'm' ? (int) ceil($num / 1024) : $num;
                        }
                        break;
                    }
                }
                if ($currentSizeGb !== null && $requestedDiskGb > $currentSizeGb) {
                    $resizeRes = $client->resizeContainerDisk(
                        $pending['target_node'],
                        (int) $pending['vmid'],
                        'rootfs',
                        $requestedDiskGb . 'G',
                    );
                    if (!$resizeRes['ok']) {
                        App::getInstance(true)->getLogger()->warning(
                            'LXC disk resize failed (continuing): ' . ($resizeRes['error'] ?? 'unknown'),
                        );
                    } elseif (is_string($resizeRes['upid'] ?? null) && $resizeRes['upid'] !== '') {
                        $wait = $client->waitTask($pending['target_node'], (string) $resizeRes['upid'], 600, 5);
                        if (!$wait['ok']) {
                            App::getInstance(true)->getLogger()->warning(
                                'LXC disk resize task failed: ' . ($wait['error'] ?? 'unknown'),
                            );
                        }
                    }
                }
            }
        } else {
            $ipconfig0 = 'ip=' . $ip['ip'] . '/' . $cidr;
            if ($gateway !== '') {
                $ipconfig0 .= ',gw=' . $gateway;
            }

            // Use ci_user/ci_password from pending if provided, otherwise sane defaults. (SO THEY WON'T BE FUCKING NULL)
            $finalCiUser = $ciUserFromPending ?: 'debian';
            $finalCiPassword = $ciPasswordFromPending ?: bin2hex(random_bytes(6));
			// Yes we could have done that above insted of just making it a null BUT it didn't work. So we do it like that so IN THE END let it be :)))))

            // Build description with detailed info for Proxmox notes
            $descParts = ['FeatherPanel Managed VM'];
            if (!empty($ip['ip'])) {
                $descParts[] = 'IP: ' . $ip['ip'];
            }
            if (!empty($pending['hostname'])) {
                $descParts[] = 'Hostname: ' . $pending['hostname'];
            }
            if (!empty($pending['user_uuid'])) {
                $descParts[] = 'User: ' . $pending['user_uuid'];
            }
            $descParts[] = 'Created: ' . date('Y-m-d H:i:s');

            $config = [
                'memory' => $memory,
                'sockets' => $cpus,
                'cores' => $cores,
                'nameserver' => '1.1.1.1 8.8.8.8',
                'ipconfig0' => $ipconfig0,
                'onboot' => $onBoot ? 1 : 0,
                'boot' => 'order=scsi0',
                'ciuser' => $finalCiUser,
                'cipassword' => $finalCiPassword,
                'tags' => 'FeatherPanel-Managed',
                'description' => implode(' | ', $descParts),
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
                'vmid'         => (int) $pending['vmid'],
                'vm_node_id'   => (int) $pending['vm_node_id'],
                'user_uuid'    => $pending['user_uuid'],
                'pve_node'     => $pending['target_node'],
                'plan_id'      => isset($pending['plan_id']) && $pending['plan_id'] > 0 ? (int) $pending['plan_id'] : null,
                'template_id'  => $pending['template_id'] ? (int) $pending['template_id'] : null,
                'vm_type'      => $vmType,
                'hostname'     => $pending['hostname'],
                'status'       => 'stopped',
                'ip_address'   => $ip['ip'],
                'subnet_mask'  => null,
                'gateway'      => $ip['gateway'] ?? null,
                'vm_ip_id'     => $pending['vm_ip_id'] ? (int) $pending['vm_ip_id'] : null,
                'notes'        => $userNotesForInstance,
                'backup_limit' => isset($pending['backup_limit']) ? (int) $pending['backup_limit'] : 5,
                'memory'       => (int) ($pending['memory'] ?? 512),
                'cpus'         => (int) ($pending['cpus'] ?? 1),
                'cores'        => (int) ($pending['cores'] ?? 1),
                'disk_gb'      => (int) ($pending['disk'] ?? 10),
                'on_boot'      => !empty($pending['on_boot']) ? 1 : 0,
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

                // For LXC we do not manage or change root passwords from FeatherPanel.
				// SINCE GUESS WHAT YOU CAN'T FFS FUCKING PROXMOXXXXXXX API 
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
        VmInstanceActivity::createActivity([
            'vm_instance_id' => (int) $instance['id'],
            'vm_node_id' => (int) $pending['vm_node_id'],
            'user_id' => isset($admin['id']) ? (int) $admin['id'] : null,
            'event' => 'vm:create',
            'metadata' => ['hostname' => $pending['hostname'] ?? null, 'vmid' => $pending['vmid']],
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);

        $instance = VmInstance::getById((int) $instance['id']);

        return ApiResponse::success([
            'status'   => 'active',
            'instance' => $instance,
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
                $efiStorage = isset($proxmoxUpdate['efi_storage']) && is_string($proxmoxUpdate['efi_storage'])
                    ? trim($proxmoxUpdate['efi_storage'])
                    : null;
                if ($efiEnabled === true && !isset($curQemuConfig['efidisk0'])) {
                    $storageName = $efiStorage !== null && $efiStorage !== '' ? $efiStorage : 'local-lvm';
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
                $tpmStorage = isset($proxmoxUpdate['tpm_storage']) && is_string($proxmoxUpdate['tpm_storage'])
                    ? trim($proxmoxUpdate['tpm_storage'])
                    : null;
                if ($tpmEnabled === true && !isset($curQemuConfig['tpmstate0'])) {
                    $storageName = $tpmStorage !== null && $tpmStorage !== '' ? $tpmStorage : 'local-lvm';
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
        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id' => (int) ($instance['vm_node_id'] ?? 0),
            'user_id' => isset($admin['id']) ? (int) $admin['id'] : null,
            'event' => 'vm:power.' . $action,
            'metadata' => ['hostname' => $instance['hostname'] ?? null],
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['instance' => $instance], 'Power action completed', 200);
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
        $reinstallId = trim($reinstallId);
        if ($reinstallId === '') {
            return ApiResponse::error('Missing reinstall_id', 'INVALID_ID', 400);
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

        $instanceId = (int) ($reinstallMeta['instance_id'] ?? 0);
        $out = VmInstanceUtil::completeReinstallAfterClone($reinstallId, $pending, $reinstallMeta, $client);

        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'vm_instance_reinstall_complete',
            'context' => 'Reinstall completed for instance ID ' . $instanceId . ' (new vmid ' . $out['new_vmid'] . ')',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'status'   => 'active',
            'instance' => $out['instance'],
        ], 'VM reinstalled successfully', 200);
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
        $storage  = is_string($data['storage'] ?? null) ? trim($data['storage']) : '';
        $compress = is_string($data['compress'] ?? null) ? trim($data['compress']) : 'zstd';
        $mode     = is_string($data['mode'] ?? null) ? trim($data['mode']) : 'snapshot';
        $node     = $instance['pve_node'] ?? '';
        $vmid     = (int) $instance['vmid'];
        $vmType   = $instance['vm_type'] ?? 'qemu';

        if ($storage === '') {
            $storagesRes = $client->getBackupStorages($node);
            if (!$storagesRes['ok'] || empty($storagesRes['storages'])) {
                return ApiResponse::error('No backup-capable storage found on node', 'NO_BACKUP_STORAGE', 400);
            }
            $storage = $storagesRes['storages'][0];
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
        $meta = json_encode([
            'type'        => 'backup',
            'instance_id' => $id,
            'vmid'        => $vmid,
            'node'        => $node,
            'storage'     => $storage,
        ], JSON_UNESCAPED_SLASHES);

        $targetNode = $node !== '' ? $node : (string) ($instance['pve_node'] ?? '');
        $hostname   = (string) ($instance['hostname'] ?? ('vm-' . $vmid));
        $vmNodeId   = (int) ($instance['vm_node_id'] ?? 0);
        $planId     = isset($instance['plan_id']) && (int) $instance['plan_id'] > 0 ? (int) $instance['plan_id'] : null;
        $backupLimitForPending = $backupLimit;

        VmCreationPending::create([
            'creation_id'  => $backupId,
            'upid'         => $result['upid'],
            'target_node'  => $targetNode,
            'vmid'         => $vmid,
            'hostname'     => $hostname,
            'vm_node_id'   => $vmNodeId,
            'plan_id'      => $planId,
            'template_id'  => isset($instance['template_id']) ? (int) $instance['template_id'] : null,
            'vm_ip_id'     => isset($instance['vm_ip_id']) ? (int) $instance['vm_ip_id'] : null,
            'user_uuid'    => $instance['user_uuid'] ?? null,
            'notes'        => $meta,
            'vm_type'      => $vmType,
            'memory'       => 512,
            'cpus'         => 1,
            'cores'        => 1,
            'disk'         => 10,
            'storage'      => $storage,
            'bridge'       => 'vmbr0',
            'on_boot'      => 1,
            'backup_limit' => $backupLimitForPending,
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
        $pending = VmCreationPending::getByCreationId($backupId);
        if (!$pending) {
            return ApiResponse::error('Backup task not found', 'NOT_FOUND', 404);
        }

        $meta = json_decode($pending['notes'] ?? '{}', true);
        if (!is_array($meta) || ($meta['type'] ?? '') !== 'backup') {
            return ApiResponse::error('Invalid backup task', 'INVALID_TASK', 400);
        }

        $instanceId = (int) ($meta['instance_id'] ?? 0);
        $instance   = VmInstance::getById($instanceId);
        if (!$instance) {
            VmCreationPending::deleteByCreationId($backupId);

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

        $node = $meta['node'] ?? ($instance['pve_node'] ?? '');
        $upid = $pending['upid'] ?? '';

        $taskResult = $client->getTaskStatus($node, $upid);
        if (!$taskResult['ok']) {
            return ApiResponse::success(['status' => 'running'], 'Backup in progress', 200);
        }

        $taskStatus = $taskResult['status'] ?? '';
        $exitStatus = $taskResult['exitstatus'] ?? '';

        if ($taskStatus !== 'stopped') {
            return ApiResponse::success(['status' => 'running'], 'Backup in progress', 200);
        }

        VmCreationPending::deleteByCreationId($backupId);

        if ($exitStatus !== 'OK') {
            return ApiResponse::success(
                ['status' => 'failed', 'error' => 'Backup task exited with: ' . $exitStatus],
                'Backup failed',
                200
            );
        }

        $storageForBackup = is_string($meta['storage'] ?? null) ? (string) $meta['storage'] : '';
        $nodeForBackup = $node !== '' ? $node : ($instance['pve_node'] ?? '');
        $vmidForBackup = (int) $instance['vmid'];

        if ($nodeForBackup !== '' && $vmidForBackup > 0 && $storageForBackup !== '') {
            $list = $client->listVmBackups((string) $nodeForBackup, $vmidForBackup);
            if ($list['ok'] && !empty($list['backups'])) {
                $matching = array_values(array_filter(
                    $list['backups'],
                    static function (array $b) use ($storageForBackup): bool {
                        return isset($b['storage']) && (string) $b['storage'] === $storageForBackup;
                    }
                ));

                if (!empty($matching)) {
                    /** @var array<string, mixed> $latest */
                    $latest = $matching[0];

                    VmInstanceBackup::create([
                        'vm_instance_id' => $instanceId,
                        'vmid'           => $vmidForBackup,
                        'storage'        => $storageForBackup,
                        'volid'          => (string) ($latest['volid'] ?? ''),
                        'size_bytes'     => isset($latest['size']) ? (int) $latest['size'] : 0,
                        'ctime'          => isset($latest['ctime']) ? (int) $latest['ctime'] : 0,
                        'format'         => isset($latest['format']) ? (string) $latest['format'] : null,
                    ]);
                } else {
                    App::getInstance(true)->getLogger()->warning(
                        'Backup finished but no matching vzdump volume found for instance ' . $instanceId .
                        ' on storage ' . $storageForBackup
                    );
                }
            }
        }

        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid'  => $admin['uuid'] ?? null,
            'name'       => 'vm_instance_backup_done',
            'context'    => 'Backup completed for instance ID ' . $instanceId,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['status' => 'done'], 'Backup completed', 200);
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
        $meta = json_encode([
            'type'        => 'restore_backup',
            'instance_id' => $id,
            'vmid'        => $vmid,
            'node'        => $node,
            'storage'     => $storage,
            'volid'       => $volid,
            'vm_type'     => $vmType,
        ], JSON_UNESCAPED_SLASHES);

        $targetNode = $node !== '' ? $node : (string) ($instance['pve_node'] ?? '');
        $hostname   = (string) ($instance['hostname'] ?? ('vm-' . $vmid));
        $vmNodeId   = (int) ($instance['vm_node_id'] ?? 0);
        $planId     = isset($instance['plan_id']) && (int) $instance['plan_id'] > 0 ? (int) $instance['plan_id'] : null;
        $backupLimitForPending = (int) ($instance['backup_limit'] ?? 5);

        VmCreationPending::create([
            'creation_id'  => $restoreId,
            'upid'         => $result['upid'],
            'target_node'  => $targetNode,
            'vmid'         => $vmid,
            'hostname'     => $hostname,
            'vm_node_id'   => $vmNodeId,
            'plan_id'      => $planId,
            'template_id'  => isset($instance['template_id']) ? (int) $instance['template_id'] : null,
            'vm_ip_id'     => isset($instance['vm_ip_id']) ? (int) $instance['vm_ip_id'] : null,
            'user_uuid'    => $instance['user_uuid'] ?? null,
            'notes'        => $meta,
            'vm_type'      => $vmType,
            'memory'       => 512,
            'cpus'         => 1,
            'cores'        => 1,
            'disk'         => 10,
            'storage'      => $storage,
            'bridge'       => 'vmbr0',
            'on_boot'      => 1,
            'backup_limit' => $backupLimitForPending,
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
        $pending = VmCreationPending::getByCreationId($restoreId);
        if (!$pending) {
            return ApiResponse::error('Restore task not found', 'NOT_FOUND', 404);
        }

        $meta = json_decode($pending['notes'] ?? '{}', true);
        if (!is_array($meta) || ($meta['type'] ?? '') !== 'restore_backup') {
            return ApiResponse::error('Invalid restore task', 'INVALID_TASK', 400);
        }

        $instanceId = (int) ($meta['instance_id'] ?? 0);
        $instance   = VmInstance::getById($instanceId);
        if (!$instance) {
            VmCreationPending::deleteByCreationId($restoreId);

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

        $node   = $meta['node'] ?? ($instance['pve_node'] ?? '');
        $vmid   = (int) ($meta['vmid'] ?? $instance['vmid']);
        $vmType = $meta['vm_type'] ?? ($instance['vm_type'] ?? 'qemu');
        $upid   = $pending['upid'] ?? '';

        $taskResult = $client->getTaskStatus($node, $upid);
        if (!$taskResult['ok']) {
            return ApiResponse::success(['status' => 'restoring'], 'Restore in progress', 200);
        }

        $taskStatus = $taskResult['status'] ?? '';
        $exitStatus = $taskResult['exitstatus'] ?? '';

        if ($taskStatus !== 'stopped') {
            return ApiResponse::success(['status' => 'restoring'], 'Restore in progress', 200);
        }

        VmCreationPending::deleteByCreationId($restoreId);

        if ($exitStatus !== 'OK') {
            return ApiResponse::success(['status' => 'failed', 'error' => 'Restore task exited with: ' . $exitStatus], 'Restore failed', 200);
        }

        $startResult = $client->startVm($node, $vmid, $vmType);
        $finalStatus = $startResult['ok'] ? 'running' : 'stopped';

        try {
            $pdo  = Database::getPdoConnection();
            $stmt = $pdo->prepare('UPDATE featherpanel_vm_instances SET status = :status WHERE id = :id');
            $stmt->execute(['status' => $finalStatus, 'id' => $instanceId]);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('RestoreBackup: failed to update DB status: ' . $e->getMessage());
        }

        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid'  => $admin['uuid'] ?? null,
            'name'       => 'vm_instance_restore_done',
            'context'    => 'Restore completed for instance ID ' . $instanceId . ' (vmid ' . $vmid . ')',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['status' => 'active', 'instance' => $instance], 'Restore completed', 200);
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

        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node !== null && $node !== '') {
            $vmType = in_array($instance['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true) ? $instance['vm_type'] : 'qemu';
            $client->stopVm($node, (int) $instance['vmid'], $vmType);
            sleep(2);
            VmInstanceUtil::deleteInstanceBackups($instance, $client);
            $deleteResult = $client->deleteVm($node, (int) $instance['vmid'], $vmType);
            if (!$deleteResult['ok']) {
                App::getInstance(true)->getLogger()->error(
                    'Failed to delete VM/CT from Proxmox for instance ' . $id . ' (vmid ' . $instance['vmid'] . '): ' .
                    ($deleteResult['error'] ?? 'unknown')
                );

                return ApiResponse::error(
                    'Failed to delete VM from Proxmox: ' . ($deleteResult['error'] ?? 'unknown'),
                    'PROXMOX_DELETE_FAILED',
                    502
                );
            }
        } else {
            VmInstanceUtil::deleteInstanceBackups($instance, null);
        }

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id' => (int) ($instance['vm_node_id'] ?? 0),
            'user_id' => isset($admin['id']) ? (int) $admin['id'] : null,
            'event' => 'vm:delete',
            'metadata' => ['hostname' => $instance['hostname'] ?? null],
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);
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
