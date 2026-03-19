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
use App\Chat\VmIp;
use App\Chat\VmNode;
use App\Chat\VmTask;
use App\Chat\Database;
use App\Chat\VmSubuser;
use App\Chat\VmInstance;
use App\Chat\VmTemplate;
use App\Chat\VmInstanceIp;
use App\Helpers\VmGateway;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\VmInstanceActivity;
use App\Services\Vm\VmInstanceUtil;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

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

        $vmInstance['access_password'] = $vmInstance['is_owner']
            ? self::resolveAccessPassword($vmInstance)
            : null;
        $vmInstance['assigned_ips'] = VmInstanceIp::getByInstanceId((int) $vmInstance['id']);

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

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/qemu-hardware',
        summary: 'Get QEMU hardware settings (EFI + TPM + Serial)',
        description: 'Returns the current QEMU BIOS mode and whether EFI disk, TPM state disk, and serial0 socket are enabled.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Hardware settings fetched successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'bios', type: 'string', nullable: true),
                        new OA\Property(property: 'efi_enabled', type: 'boolean'),
                        new OA\Property(property: 'tpm_enabled', type: 'boolean'),
                        new OA\Property(property: 'serial0_enabled', type: 'boolean'),
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
    public function getQemuHardware(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'settings')) {
            return ApiResponse::error('You do not have permission to change settings for this VM', 'PERMISSION_DENIED', 403);
        }

        if (($vmInstance['vm_type'] ?? 'qemu') !== 'qemu') {
            return ApiResponse::error('QEMU hardware settings are only available for QEMU VMs', 'INVALID_VM_TYPE', 400);
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

        $result = $client->getVmConfig($node, (int) $vmInstance['vmid'], 'qemu');
        if (!$result['ok'] || !is_array($result['config'] ?? null)) {
            return ApiResponse::error('Failed to fetch QEMU hardware config', 'PROXMOX_ERROR', 502);
        }

        $cfg = $result['config'];
        $bios = isset($cfg['bios']) && is_string($cfg['bios']) ? $cfg['bios'] : null;
        $serial0Enabled = array_key_exists('serial0', $cfg) && is_string($cfg['serial0'])
            ? str_contains($cfg['serial0'], 'socket')
            : false;

        return ApiResponse::success(
            [
                'bios' => $bios,
                'efi_enabled' => array_key_exists('efidisk0', $cfg),
                'tpm_enabled' => array_key_exists('tpmstate0', $cfg),
                'serial0_enabled' => $serial0Enabled,
            ],
            'Hardware settings fetched',
            200
        );
    }

    #[OA\Patch(
        path: '/api/user/vm-instances/{id}/qemu-hardware',
        summary: 'Update QEMU hardware settings (EFI + TPM + Serial)',
        description: 'Updates Proxmox config to enable/disable EFI disk, TPM state disk, and serial0 socket. Optional BIOS mode can be updated.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'bios', type: 'string', enum: ['seabios', 'ovmf'], nullable: true),
                    new OA\Property(property: 'efi_enabled', type: 'boolean', nullable: true),
                    new OA\Property(property: 'tpm_enabled', type: 'boolean', nullable: true),
                    new OA\Property(property: 'serial0_enabled', type: 'boolean', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Hardware updated successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'Proxmox error'),
        ]
    )]
    public function patchQemuHardware(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'settings')) {
            return ApiResponse::error('You do not have permission to change settings for this VM', 'PERMISSION_DENIED', 403);
        }

        if (($vmInstance['vm_type'] ?? 'qemu') !== 'qemu') {
            return ApiResponse::error('QEMU hardware settings are only available for QEMU VMs', 'INVALID_VM_TYPE', 400);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            $data = [];
        }

        $biosMode = null;
        if (array_key_exists('bios', $data) && $data['bios'] !== null) {
            $rawBios = is_string($data['bios']) ? strtolower(trim($data['bios'])) : '';
            if (!in_array($rawBios, ['seabios', 'ovmf'], true)) {
                return ApiResponse::error('Invalid bios value', 'INVALID_BIOS', 400);
            }
            $biosMode = $rawBios;
        }

        $efiEnabled = null;
        if (array_key_exists('efi_enabled', $data) && $data['efi_enabled'] !== null) {
            $efiEnabledParsed = filter_var($data['efi_enabled'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($efiEnabledParsed === null) {
                return ApiResponse::error('Invalid efi_enabled value', 'INVALID_EFI', 400);
            }
            $efiEnabled = $efiEnabledParsed;
        }

        $tpmEnabled = null;
        if (array_key_exists('tpm_enabled', $data) && $data['tpm_enabled'] !== null) {
            $tpmEnabledParsed = filter_var($data['tpm_enabled'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($tpmEnabledParsed === null) {
                return ApiResponse::error('Invalid tpm_enabled value', 'INVALID_TPM', 400);
            }
            $tpmEnabled = $tpmEnabledParsed;
        }

        $serial0Enabled = null;
        if (array_key_exists('serial0_enabled', $data) && $data['serial0_enabled'] !== null) {
            $serialEnabledParsed = filter_var($data['serial0_enabled'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($serialEnabledParsed === null) {
                return ApiResponse::error('Invalid serial0_enabled value', 'INVALID_SERIAL0_ENABLED', 400);
            }
            $serial0Enabled = $serialEnabledParsed;
        }

        if ($biosMode === null && $efiEnabled === null && $tpmEnabled === null && $serial0Enabled === null) {
            return ApiResponse::success(['instance' => $vmInstance], 'No changes to apply', 200);
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

        $vmid = (int) $vmInstance['vmid'];

        $curCfg = $client->getVmConfig($node, $vmid, 'qemu');
        if (!$curCfg['ok'] || !is_array($curCfg['config'] ?? null)) {
            return ApiResponse::error('Failed to fetch current QEMU config', 'PROXMOX_ERROR', 502);
        }
        /** @var array<string, mixed> $curQemuConfig */
        $curQemuConfig = $curCfg['config'];

        $config = [];
        $deleteKeys = [];

        if ($biosMode !== null) {
            $config['bios'] = $biosMode;
        }

        // Enabling TPM usually requires UEFI + EFI disk; auto-enable EFI if needed
        // unless the user explicitly disabled EFI.
        if ($tpmEnabled === true && $efiEnabled !== false && !array_key_exists('efidisk0', $curQemuConfig)) {
            $efiEnabled = true;
        }

        if ($efiEnabled === true && !array_key_exists('efidisk0', $curQemuConfig)) {
            $nodeEfiStorage = isset($vmNode['storage_efi']) && is_string($vmNode['storage_efi'])
                ? trim($vmNode['storage_efi'])
                : '';
            $storageName = $nodeEfiStorage !== '' ? $nodeEfiStorage : 'local-lvm';

            $config['efidisk0'] = $storageName . ':0,efitype=4m,pre-enrolled-keys=1';
            if (!array_key_exists('bios', $config)) {
                $config['bios'] = 'ovmf';
            }
        } elseif ($efiEnabled === false && array_key_exists('efidisk0', $curQemuConfig)) {
            $efiVolRef = null;
            if (is_string($curQemuConfig['efidisk0'])) {
                $parts = explode(',', $curQemuConfig['efidisk0']);
                $efiVolRef = trim($parts[0]);
            }

            $unlinkEfi = $client->unlinkQemuDisks($node, $vmid, ['efidisk0']);
            if (!$unlinkEfi['ok']) {
                return ApiResponse::error('Failed to unlink EFI disk', 'PROXMOX_UPDATE_FAILED', 502);
            }

            if ($efiVolRef !== null && $efiVolRef !== '') {
                $cfgAfter = $client->getVmConfig($node, $vmid, 'qemu');
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
                        $unlinkUnused = $client->unlinkQemuDisks($node, $vmid, [$unusedKey]);
                        if (!$unlinkUnused['ok']) {
                            App::getInstance(true)->getLogger()->warning(
                                'Failed to destroy unused EFI disk ' . $unusedKey . ' for VM ' . $vmid . ': ' .
                                ($unlinkUnused['error'] ?? 'unknown')
                            );
                        }
                    }
                }
            }
        }

        if ($tpmEnabled === true && !array_key_exists('tpmstate0', $curQemuConfig)) {
            $nodeTpmStorage = isset($vmNode['storage_tpm']) && is_string($vmNode['storage_tpm'])
                ? trim($vmNode['storage_tpm'])
                : '';
            $storageName = $nodeTpmStorage !== '' ? $nodeTpmStorage : 'local-lvm';

            $config['tpmstate0'] = $storageName . ':1,format=qcow2,version=v2.0';
            if (!array_key_exists('bios', $config)) {
                // Keep BIOS compatible for TPM use cases.
                $config['bios'] = 'ovmf';
            }
        } elseif ($tpmEnabled === false && array_key_exists('tpmstate0', $curQemuConfig)) {
            $tpmVolRef = null;
            if (is_string($curQemuConfig['tpmstate0'])) {
                $parts = explode(',', $curQemuConfig['tpmstate0']);
                $tpmVolRef = trim($parts[0]);
            }

            $unlinkTpm = $client->unlinkQemuDisks($node, $vmid, ['tpmstate0']);
            if (!$unlinkTpm['ok']) {
                return ApiResponse::error('Failed to unlink TPM disk', 'PROXMOX_UPDATE_FAILED', 502);
            }

            if ($tpmVolRef !== null && $tpmVolRef !== '') {
                $cfgAfter = $client->getVmConfig($node, $vmid, 'qemu');
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
                        $unlinkUnused = $client->unlinkQemuDisks($node, $vmid, [$unusedKey]);
                        if (!$unlinkUnused['ok']) {
                            App::getInstance(true)->getLogger()->warning(
                                'Failed to destroy unused TPM disk ' . $unusedKey . ' for VM ' . $vmid . ': ' .
                                ($unlinkUnused['error'] ?? 'unknown')
                            );
                        }
                    }
                }
            }
        }

        if ($serial0Enabled === true) {
            // Enable serial0 socket (so noVNC might show serial output).
            $config['serial0'] = 'socket';
            // Templates sometimes set the display to serial (`vga=serial0`).
            // When enabling serial, keep display consistent.
            $config['vga'] = 'serial0';
        } elseif ($serial0Enabled === false) {
            // Disable serial console by removing serial0 from the config.
            $deleteKeys[] = 'serial0';
            // Switch display back to a graphical adapter for Windows.
            $config['vga'] = 'std';
        }

        if (!empty($config) || !empty($deleteKeys)) {
            $res = $client->setVmConfig($node, $vmid, 'qemu', $config, $deleteKeys);
            if (!$res['ok']) {
                return ApiResponse::error('Proxmox config update failed: ' . ($res['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
            }
        }

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id' => (int) ($vmInstance['vm_node_id'] ?? 0),
            'user_id' => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event' => 'vm:hardware.qemu.update',
            'metadata' => [
                'bios' => $biosMode,
                'efi_enabled' => $efiEnabled,
                'tpm_enabled' => $tpmEnabled,
                'serial0_enabled' => $serial0Enabled,
            ],
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);

        // Return updated hardware state.
        $afterCfg = $client->getVmConfig($node, $vmid, 'qemu');
        $after = is_array($afterCfg['config'] ?? null) ? $afterCfg['config'] : [];

        return ApiResponse::success(
            [
                'bios' => isset($after['bios']) && is_string($after['bios']) ? $after['bios'] : null,
                'efi_enabled' => array_key_exists('efidisk0', $after),
                'tpm_enabled' => array_key_exists('tpmstate0', $after),
                'serial0_enabled' => array_key_exists('serial0', $after) && is_string($after['serial0'])
                    ? str_contains($after['serial0'], 'socket')
                    : false,
            ],
            'QEMU hardware updated successfully',
            200
        );
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/network-options',
        summary: 'Get DNS options',
        description: 'Returns current DNS settings (nameserver/searchdomain). Supports both QEMU and LXC.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Options fetched successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'nameserver', type: 'string', nullable: true),
                        new OA\Property(property: 'searchdomain', type: 'string', nullable: true),
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
    public function getNetworkOptions(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'settings')) {
            return ApiResponse::error('You do not have permission to change settings for this VM', 'PERMISSION_DENIED', 403);
        }

        $vmNodeId = (int) ($vmInstance['vm_node_id'] ?? 0);
        if ($vmNodeId <= 0) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $vmType = ($vmInstance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';

        // Fetch current DNS values from Proxmox config (best-effort).
        $nameserver = null;
        $searchdomain = null;

        $vmNode = VmNode::getVmNodeById($vmNodeId);
        if ($vmNode) {
            try {
                $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
                $node = $vmInstance['pve_node'] ?? '';
                if ($node === '') {
                    $find = $client->findNodeByVmid((int) $vmInstance['vmid']);
                    $node = $find['ok'] ? $find['node'] : null;
                }
                if ($node !== null && $node !== '') {
                    $cfgRes = $client->getVmConfig((string) $node, (int) $vmInstance['vmid'], $vmType);
                    if ($cfgRes['ok'] && is_array($cfgRes['config'] ?? null)) {
                        $cfg = $cfgRes['config'];
                        if (array_key_exists('nameserver', $cfg) && is_string($cfg['nameserver'])) {
                            $nameserver = $cfg['nameserver'];
                        }
                        if ($vmType === 'lxc' && array_key_exists('searchdomain', $cfg) && is_string($cfg['searchdomain'])) {
                            $searchdomain = $cfg['searchdomain'];
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Ignore: UI can still show whatever DNS values it has.
            }
        }

        return ApiResponse::success(
            [
                'nameserver' => $nameserver,
                'searchdomain' => $searchdomain,
            ],
            'Network options fetched',
            200
        );
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/networking',
        summary: 'Get VM networking details',
        description: 'Returns assigned IP addresses and current DNS settings for a VDS instance.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Networking details fetched'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
        ]
    )]
    public function getNetworking(Request $request, int $id): Response
    {
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $nameserver = null;
        $searchdomain = null;
        $vmType = ($vmInstance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';

        $vmNodeId = (int) ($vmInstance['vm_node_id'] ?? 0);
        if ($vmNodeId > 0) {
            $vmNode = VmNode::getVmNodeById($vmNodeId);
            if ($vmNode) {
                try {
                    $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
                    $node = $vmInstance['pve_node'] ?? '';
                    if ($node === '') {
                        $find = $client->findNodeByVmid((int) $vmInstance['vmid']);
                        $node = $find['ok'] ? $find['node'] : null;
                    }
                    if ($node !== null && $node !== '') {
                        $cfgRes = $client->getVmConfig((string) $node, (int) $vmInstance['vmid'], $vmType);
                        if ($cfgRes['ok'] && is_array($cfgRes['config'] ?? null)) {
                            $cfg = $cfgRes['config'];
                            if (array_key_exists('nameserver', $cfg) && is_string($cfg['nameserver'])) {
                                $nameserver = $cfg['nameserver'];
                            }
                            if ($vmType === 'lxc' && array_key_exists('searchdomain', $cfg) && is_string($cfg['searchdomain'])) {
                                $searchdomain = $cfg['searchdomain'];
                            }
                        }
                    }
                } catch (\Throwable $e) {
                    // Read-only view: ignore transient Proxmox fetch failures and return available data.
                }
            }
        }

        $assignedIps = VmInstanceIp::getByInstanceId((int) $vmInstance['id']);

        // Backwards compat: VMs provisioned before the VmInstanceIp table existed
        // only have their primary IP stored on the instance row (vm_ip_id / ip_address).
        // Synthesise a primary entry so the networking page always shows at least that IP.
        if (empty($assignedIps) && !empty($vmInstance['vm_ip_id'])) {
            $ipRecord = VmIp::getById((int) $vmInstance['vm_ip_id']);
            $assignedIps = [
                [
                    'id' => null,
                    'vm_instance_id' => $vmInstance['id'],
                    'vm_ip_id' => $vmInstance['vm_ip_id'],
                    'network_key' => 'net0',
                    'bridge' => null,
                    'interface_name' => null,
                    'is_primary' => 1,
                    'sort_order' => 0,
                    'ip' => $vmInstance['ip_address'] ?? ($ipRecord['ip'] ?? null),
                    'cidr' => $ipRecord['cidr'] ?? null,
                    'gateway' => $ipRecord['gateway'] ?? null,
                    'ip_notes' => $ipRecord['notes'] ?? null,
                ],
            ];
        }

        return ApiResponse::success([
            'assigned_ips' => $assignedIps,
            'nameserver' => $nameserver,
            'searchdomain' => $searchdomain,
            'vm_type' => $vmType,
            'primary_ip' => $vmInstance['ip_address'] ?? null,
        ], 'Networking details fetched', 200);
    }

    #[OA\Patch(
        path: '/api/user/vm-instances/{id}/network-dns',
        summary: 'Update DNS settings',
        description: 'Updates nameserver (and searchdomain for LXC). Primary IP is intentionally not editable for normal users.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'nameserver', type: 'string', nullable: true),
                    new OA\Property(property: 'searchdomain', type: 'string', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Updated successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'Proxmox error'),
        ]
    )]
    public function patchNetworkDns(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'settings')) {
            return ApiResponse::error('You do not have permission to change settings for this VM', 'PERMISSION_DENIED', 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            $data = [];
        }

        $vmType = ($vmInstance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';

        $vmNodeId = (int) ($vmInstance['vm_node_id'] ?? 0);
        if ($vmNodeId <= 0) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $nameserver = array_key_exists('nameserver', $data) ? $data['nameserver'] : null;
        $nameserverParsed = null;
        if ($nameserver !== null) {
            $ns = is_string($nameserver) ? trim($nameserver) : '';
            if ($ns !== '') {
                $nameserverParsed = $ns;
            }
        }

        $searchdomain = array_key_exists('searchdomain', $data) ? $data['searchdomain'] : null;
        $searchdomainParsed = null;
        if ($searchdomain !== null) {
            $sd = is_string($searchdomain) ? trim($searchdomain) : '';
            if ($sd !== '') {
                $searchdomainParsed = $sd;
            }
        }

        if ($nameserverParsed === null && $searchdomainParsed === null) {
            return ApiResponse::success(['instance' => $vmInstance], 'No changes to apply', 200);
        }

        $vmNode = VmNode::getVmNodeById($vmNodeId);
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

        $vmid = (int) $vmInstance['vmid'];

        $config = [];

        if ($vmType === 'qemu') {
            if ($nameserverParsed !== null) {
                $config['nameserver'] = $nameserverParsed;
            }
            // searchdomain is LXC-specific in our current panel; we ignore it for QEMU.
        } else {
            // LXC
            if ($nameserverParsed !== null) {
                $config['nameserver'] = $nameserverParsed;
            }
            if ($searchdomainParsed !== null) {
                $config['searchdomain'] = $searchdomainParsed;
            }
        }

        if (!empty($config)) {
            $res = $client->setVmConfig((string) $node, $vmid, $vmType, $config, []);
            if (!$res['ok']) {
                return ApiResponse::error('Proxmox config update failed: ' . ($res['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
            }
        }

        return ApiResponse::success(['instance' => $vmInstance], 'DNS updated successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/iso-storages',
        summary: 'List ISO storages',
        description: 'Returns ISO-capable Proxmox storage names for the VM node.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'ISO storages fetched',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'storages', type: 'array', items: new OA\Items(type: 'string')),
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
    public function getIsoStorages(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'settings')) {
            return ApiResponse::error('You do not have permission to change settings for this VM', 'PERMISSION_DENIED', 403);
        }

        $vmNode = VmNode::getVmNodeById((int) ($vmInstance['vm_node_id'] ?? 0));
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

        // Per requirement: ISO storage list should match the backup storage list.
        $storages = [];
        $storagesRes = $client->getBackupStorages((string) $node);
        if ($storagesRes['ok'] && !empty($storagesRes['storages'])) {
            $storages = $storagesRes['storages'];
        }

        // Prefer node-level storage_backups default when available.
        $preferred = isset($vmNode['storage_backups']) && is_string($vmNode['storage_backups']) ? trim($vmNode['storage_backups']) : '';
        if ($preferred !== '' && in_array($preferred, $storages, true)) {
            $storages = array_merge(
                [$preferred],
                array_values(array_filter($storages, static fn ($s) => $s !== $preferred)),
            );
        }

        return ApiResponse::success(['storages' => $storages], 'ISO storages fetched', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/iso-current',
        summary: 'Get currently mounted ISO',
        description: 'Returns currently mounted ISO (if any) by inspecting QEMU cdrom devices (media=cdrom).',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'ISO current fetched'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'Proxmox error'),
        ]
    )]
    public function getIsoCurrent(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'settings')) {
            return ApiResponse::error('You do not have permission to change settings for this VM', 'PERMISSION_DENIED', 403);
        }

        $vmType = ($vmInstance['vm_type'] ?? 'qemu') === 'qemu' ? 'qemu' : 'lxc';
        if ($vmType !== 'qemu') {
            return ApiResponse::error('ISO mounting is only supported for QEMU VMs', 'ISO_NOT_SUPPORTED', 400);
        }

        $vmNode = VmNode::getVmNodeById((int) ($vmInstance['vm_node_id'] ?? 0));
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

        $vmid = (int) $vmInstance['vmid'];
        $cfgRes = $client->getVmConfig((string) $node, $vmid, 'qemu');
        if (!$cfgRes['ok'] || !is_array($cfgRes['config'] ?? null)) {
            return ApiResponse::error('Failed to fetch VM config', 'PROXMOX_ERROR', 502);
        }

        /** @var array<string, mixed> $cfg */
        $cfg = $cfgRes['config'];

        $mountedIso = null;

        // Prefer ide2 (typical cdrom slot) if present.
        foreach (['ide2', 'ide0', 'sata2', 'scsi2'] as $preferredKey) {
            $val = $cfg[$preferredKey] ?? null;
            if (!is_string($val)) {
                continue;
            }
            if (strpos($val, 'media=cdrom') === false) {
                continue;
            }
            $beforeComma = explode(',', $val)[0] ?? '';
            $beforeComma = trim($beforeComma);
            if ($beforeComma === '') {
                continue;
            }
            if (strpos($beforeComma, ':iso/') === false && strpos($beforeComma, '/iso/') === false) {
                continue;
            }
            $mountedIso = ['slot' => $preferredKey, 'volid' => $beforeComma];
            break;
        }

        // Fallback: scan any cdrom entry.
        if ($mountedIso === null) {
            foreach ($cfg as $k => $v) {
                if (!is_string($k) || !is_string($v)) {
                    continue;
                }
                if (strpos($v, 'media=cdrom') === false) {
                    continue;
                }
                $beforeComma = explode(',', $v)[0] ?? '';
                $beforeComma = trim($beforeComma);
                if ($beforeComma === '') {
                    continue;
                }
                if (strpos($beforeComma, ':iso/') === false && strpos($beforeComma, '/iso/') === false) {
                    continue;
                }
                $mountedIso = ['slot' => $k, 'volid' => $beforeComma];
                break;
            }
        }

        if ($mountedIso !== null) {
            $volid = (string) $mountedIso['volid'];
            $parts = explode(':iso/', $volid);
            $storage = $parts[0] ?? '';
            $filename = $parts[1] ?? '';
            $mountedIso['storage'] = $storage !== '' ? $storage : null;
            $mountedIso['filename'] = $filename !== '' ? $filename : null;
        }

        return ApiResponse::success(['mounted_iso' => $mountedIso], 'ISO current fetched', 200);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/iso-upload-and-mount',
        summary: 'Upload and mount an ISO',
        description: 'Uploads an ISO to Proxmox and mounts it as the VM cdrom (ide2) while enforcing only one ISO/cdrom at a time.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['file', 'storage'],
                    properties: [
                        new OA\Property(property: 'storage', type: 'string', description: 'ISO storage name on Proxmox'),
                        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'ISO file to upload'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Mounted successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'Proxmox error'),
        ]
    )]
    public function uploadAndMountIso(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'settings')) {
            return ApiResponse::error('You do not have permission to change settings for this VM', 'PERMISSION_DENIED', 403);
        }

        $vmType = ($vmInstance['vm_type'] ?? 'qemu') === 'qemu' ? 'qemu' : 'lxc';
        if ($vmType !== 'qemu') {
            return ApiResponse::error('ISO mounting is only supported for QEMU VMs', 'ISO_NOT_SUPPORTED', 400);
        }

        $storage = $request->request->get('storage');
        $storage = is_string($storage) ? trim($storage) : '';
        if ($storage === '') {
            return ApiResponse::error('storage is required', 'STORAGE_REQUIRED', 400);
        }

        $uploadedFile = $request->files->get('file');
        if (!$uploadedFile) {
            return ApiResponse::error('file is required', 'FILE_REQUIRED', 400);
        }

        $originalName = is_string($uploadedFile->getClientOriginalName())
            ? $uploadedFile->getClientOriginalName()
            : 'uploaded.iso';

        $lowerName = strtolower($originalName);
        if (!str_ends_with($lowerName, '.iso')) {
            return ApiResponse::error('Only .iso files are allowed', 'INVALID_FILE_TYPE', 400);
        }

        $maxBytes = 1024 * 1024 * 1024; // 1 GiB
        $fileSize = (int) $uploadedFile->getSize();
        if ($fileSize <= 0) {
            return ApiResponse::error('Invalid file size', 'INVALID_FILE', 400);
        }
        if ($fileSize > $maxBytes) {
            return ApiResponse::error('ISO file too large (max 1 GiB)', 'FILE_TOO_LARGE', 400);
        }

        $vmNode = VmNode::getVmNodeById((int) ($vmInstance['vm_node_id'] ?? 0));
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

        $vmid = (int) $vmInstance['vmid'];

        $tmpDir = sys_get_temp_dir() . '/featherpanel-iso-upload';
        if (!is_dir($tmpDir)) {
            @mkdir($tmpDir, 0700, true);
        }
        $tmpPath = $tmpDir . '/' . bin2hex(random_bytes(8)) . '-' . basename($originalName);

        try {
            $uploadedFile->move($tmpDir, basename($tmpPath));

            $uploadRes = $client->uploadIsoToStorage((string) $node, $storage, $tmpPath, basename($originalName));
            if (!$uploadRes['ok']) {
                $uploadErr = $uploadRes['error'] ?? 'unknown';
                $uploadErrStr = is_string($uploadErr) ? $uploadErr : 'unknown';

                // Proxmox (pveproxy/nginx) rejects the request when the ISO is over its configured upload limit.
                // Surface this as an explicit 413 so the frontend can show a helpful message.
                if (
                    str_contains($uploadErrStr, '413')
                    || str_contains(strtolower($uploadErrStr), 'payload too large')
                ) {
                    return ApiResponse::error(
                        'Proxmox rejected the ISO upload (413 Payload Too Large). Upload a smaller ISO or increase Proxmox upload limit (nginx/pveproxy `client_max_body_size`).',
                        'PROXMOX_PAYLOAD_TOO_LARGE',
                        413
                    );
                }

                return ApiResponse::error('Failed to upload ISO: ' . $uploadErrStr, 'PROXMOX_ERROR', 502);
            }

            $volid = $uploadRes['volid'] ?? null;
            if (!is_string($volid) || $volid === '') {
                return ApiResponse::error('ISO upload did not return a volid', 'UPLOAD_FAILED', 502);
            }

            // Enforce only one cdrom/iso at a time: unlink all media=cdrom devices.
            $cfgRes = $client->getVmConfig((string) $node, $vmid, 'qemu');
            $cdromKeys = [];
            if ($cfgRes['ok'] && is_array($cfgRes['config'] ?? null)) {
                foreach ($cfgRes['config'] as $k => $v) {
                    if (!is_string($k) || !is_string($v)) {
                        continue;
                    }
                    if (strpos($v, 'media=cdrom') === false) {
                        continue;
                    }
                    $cdromKeys[] = $k;
                }
            }
            $cdromKeys = array_values(array_unique($cdromKeys));
            if (!empty($cdromKeys)) {
                $unlinkRes = $client->unlinkQemuDisks((string) $node, $vmid, $cdromKeys);
                if (!$unlinkRes['ok']) {
                    return ApiResponse::error('Failed to unmount previous cdrom: ' . ($unlinkRes['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
                }
            }

            // Mount ISO into ide2 and make it boot priority.
            // Some VMs already have a boot order (usually `boot=order=scsi0;net0`).
            // We preserve the existing list but force `ide2` to be the first device.
            $cfgForBoot = is_array($cfgRes['config'] ?? null) ? $cfgRes['config'] : [];
            $bootStr = isset($cfgForBoot['boot']) && is_string($cfgForBoot['boot']) ? $cfgForBoot['boot'] : '';
            $bootDevices = [];
            if ($bootStr !== '' && preg_match('/order=([^,]+)/', $bootStr, $m)) {
                $orderPart = (string) ($m[1] ?? '');
                $bootDevices = array_map('trim', explode(';', $orderPart));
            }
            $bootDevices = array_values(array_filter($bootDevices, static fn ($d) => is_string($d) && $d !== ''));
            $bootDevices = array_values(array_unique(array_merge(['ide2'], $bootDevices)));
            $bootValue = 'order=' . implode(';', $bootDevices);

            $config = [
                'ide2' => $volid . ',media=cdrom',
                'boot' => $bootValue,
            ];
            $setRes = $client->setVmConfig((string) $node, $vmid, 'qemu', $config, []);
            if (!$setRes['ok']) {
                return ApiResponse::error('Proxmox mount/config update failed: ' . ($setRes['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
            }

            return ApiResponse::success(
                ['mounted_iso' => ['slot' => 'ide2', 'volid' => $volid, 'storage' => $storage, 'filename' => basename($originalName)]],
                'ISO mounted successfully',
                200
            );
        } finally {
            if (is_file($tmpPath)) {
                @unlink($tmpPath);
            }
        }
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/iso-fetch-and-mount',
        summary: 'Fetch ISO from URL and mount it',
        description: 'Proxmox downloads the ISO directly from a remote URL into the ISO storage, then mounts it as VM cdrom (ide2) while enforcing only one ISO/cdrom at a time.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'storage', type: 'string', description: 'ISO storage name on Proxmox'),
                    new OA\Property(property: 'url', type: 'string', format: 'uri', description: 'Remote ISO URL to download'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Mounted successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'Proxmox error'),
        ]
    )]
    public function fetchAndMountIsoFromUrl(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'settings')) {
            return ApiResponse::error('You do not have permission to change settings for this VM', 'PERMISSION_DENIED', 403);
        }

        $vmType = ($vmInstance['vm_type'] ?? 'qemu') === 'qemu' ? 'qemu' : 'lxc';
        if ($vmType !== 'qemu') {
            return ApiResponse::error('ISO mounting is only supported for QEMU VMs', 'ISO_NOT_SUPPORTED', 400);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            $data = [];
        }

        $storage = isset($data['storage']) ? (is_string($data['storage']) ? trim($data['storage']) : '') : '';
        if ($storage === '') {
            return ApiResponse::error('storage is required', 'STORAGE_REQUIRED', 400);
        }

        $url = isset($data['url']) ? (is_string($data['url']) ? trim($data['url']) : '') : '';
        if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
            return ApiResponse::error('url is invalid', 'INVALID_URL', 400);
        }
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        if (!in_array($scheme, ['http', 'https'], true)) {
            return ApiResponse::error('Only http/https URLs are allowed', 'INVALID_URL_SCHEME', 400);
        }

        $maxBytes = 1024 * 1024 * 1024; // 1 GiB

        $vmNode = VmNode::getVmNodeById((int) ($vmInstance['vm_node_id'] ?? 0));
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        try {
            $pClient = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $node = $vmInstance['pve_node'] ?? '';
        if ($node === '') {
            $find = $pClient->findNodeByVmid((int) $vmInstance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }

        $vmid = (int) $vmInstance['vmid'];

        $taskId = bin2hex(random_bytes(16));
        $meta = [
            'action' => 'iso_fetch_and_mount',
            'instance_id' => (int) $id,
            'vm_type' => 'qemu',
            'url' => $url,
            'storage' => $storage,
            'max_bytes' => $maxBytes,
        ];

        $saved = VmTask::create([
            'task_id' => $taskId,
            'instance_id' => (int) $id,
            'vm_node_id' => (int) ($vmInstance['vm_node_id'] ?? 0),
            'task_type' => 'iso_fetch_and_mount',
            'status' => 'pending',
            'upid' => '',
            'target_node' => (string) $node,
            'vmid' => $vmid,
            'data' => $meta,
            'user_uuid' => $user['uuid'] ?? null,
        ]);

        if (!$saved) {
            return ApiResponse::error('Failed to create ISO task', 'DB_ERROR', 500);
        }

        VmInstanceActivity::createActivity([
            'vm_instance_id' => (int) $id,
            'vm_node_id' => (int) ($vmInstance['vm_node_id'] ?? 0),
            'user_id' => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event' => 'vm:iso.fetch_and_mount.start',
            'metadata' => ['storage' => $storage],
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(
            ['task_id' => $taskId, 'message' => 'ISO fetch queued'],
            'ISO fetch queued',
            202
        );
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/iso-unmount',
        summary: 'Unmount ISO',
        description: 'Unlinks cdrom devices (media=cdrom) and sets VM boot order back to the main disk.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Unmounted successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 500, description: 'Internal server error'),
            new OA\Response(response: 502, description: 'Proxmox error'),
        ]
    )]
    public function unmountIso(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'settings')) {
            return ApiResponse::error('You do not have permission to change settings for this VM', 'PERMISSION_DENIED', 403);
        }

        $vmType = ($vmInstance['vm_type'] ?? 'qemu') === 'qemu' ? 'qemu' : 'lxc';
        if ($vmType !== 'qemu') {
            return ApiResponse::error('ISO mounting is only supported for QEMU VMs', 'ISO_NOT_SUPPORTED', 400);
        }

        $vmNode = VmNode::getVmNodeById((int) ($vmInstance['vm_node_id'] ?? 0));
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

        $vmid = (int) $vmInstance['vmid'];

        $cfgRes = $client->getVmConfig((string) $node, $vmid, 'qemu');
        if (!$cfgRes['ok'] || !is_array($cfgRes['config'] ?? null)) {
            return ApiResponse::error('Failed to fetch VM config', 'PROXMOX_ERROR', 502);
        }

        /** @var array<string, mixed> $cfg */
        $cfg = $cfgRes['config'];

        // Preserve cloud-init config values so we can force Proxmox to regenerate
        // the cloud-init seed ISO after we unlink the currently mounted ISO.
        // This is required so users can manage IP/DNS again after unmounting.
        $cloudInitReset = [];
        foreach (['ciuser', 'cipassword', 'ipconfig0', 'nameserver'] as $k) {
            if (array_key_exists($k, $cfg) && is_string($cfg[$k])) {
                $v = trim($cfg[$k]);
                if ($v !== '') {
                    $cloudInitReset[$k] = $v;
                }
            }
        }

        $cdromKeys = [];
        foreach ($cfg as $k => $v) {
            if (!is_string($k) || !is_string($v)) {
                continue;
            }
            if (strpos($v, 'media=cdrom') === false) {
                continue;
            }
            $cdromKeys[] = $k;
        }
        $cdromKeys = array_values(array_unique($cdromKeys));

        // Detect whether Proxmox already re-attached cloud-init seed after we re-apply inputs.
        $hasCloudInitSeed = static function (array $vmCfg): bool {
            foreach ($vmCfg as $k => $v) {
                if (!is_string($v)) {
                    continue;
                }

                $vLower = strtolower($v);
                $isCdrom = str_contains($vLower, 'media=cdrom');
                $looksLikeCloudInit = str_contains($vLower, 'cloudinit') || str_contains($vLower, 'cloud-init');

                if ($isCdrom && $looksLikeCloudInit) {
                    return true;
                }
            }

            return false;
        };

        $finalCfg = $cfg;
        $cloudInitRestored = false;

        // Attempt A: re-apply cloud-init inputs FIRST (while ISO is still attached).
        // This gives Proxmox a chance to overwrite ide2 back to the cloud-init seed ISO.
        if (!empty($cloudInitReset)) {
            $regenRes1 = $client->setVmConfig((string) $node, $vmid, 'qemu', $cloudInitReset, []);
            if ($regenRes1['ok']) {
                $afterCfgRes1 = $client->getVmConfig((string) $node, $vmid, 'qemu');
                if ($afterCfgRes1['ok'] && is_array($afterCfgRes1['config'] ?? null)) {
                    $finalCfg = $afterCfgRes1['config'];
                    $cloudInitRestored = $hasCloudInitSeed($finalCfg);
                }
            }
        }

        // Attempt B: if cloud-init didn't come back, unlink cdrom(s) and re-apply again.
        if (!$cloudInitRestored) {
            if (!empty($cdromKeys)) {
                $unlinkRes = $client->unlinkQemuDisks((string) $node, $vmid, $cdromKeys);
                if (!$unlinkRes['ok']) {
                    return ApiResponse::error('Failed to unmount cdrom: ' . ($unlinkRes['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
                }
            }

            if (!empty($cloudInitReset)) {
                $regenRes2 = $client->setVmConfig((string) $node, $vmid, 'qemu', $cloudInitReset, []);
                if (!$regenRes2['ok']) {
                    App::getInstance(true)->getLogger()->warning(
                        'Failed to reapply cloud-init seed inputs after ISO unmount for VM ' .
                        $vmid . ': ' . ($regenRes2['error'] ?? 'unknown')
                    );
                }
            }

            $afterCfgRes2 = $client->getVmConfig((string) $node, $vmid, 'qemu');
            if ($afterCfgRes2['ok'] && is_array($afterCfgRes2['config'] ?? null)) {
                $finalCfg = $afterCfgRes2['config'];
            }

            $cloudInitRestored = $hasCloudInitSeed($finalCfg);
        }

        if (!empty($cloudInitReset) && !$cloudInitRestored) {
            return ApiResponse::error(
                'Cloud-init seed ISO was not restored after ISO unmount',
                'CLOUDINIT_NOT_RESTORED',
                502
            );
        }

        // Restore boot order to main disk (preferred devices in order).
        $preferred = ['scsi0', 'virtio0', 'sata0', 'ide0'];
        $bootDisk = 'scsi0';
        foreach ($preferred as $candidate) {
            if (array_key_exists($candidate, $finalCfg)) {
                $bootDisk = $candidate;
                break;
            }
        }
        $setRes = $client->setVmConfig((string) $node, $vmid, 'qemu', ['boot' => 'order=' . $bootDisk], []);
        if (!$setRes['ok']) {
            return ApiResponse::error('Proxmox boot order update failed: ' . ($setRes['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
        }

        return ApiResponse::success([], 'ISO unmounted successfully', 200);
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

        $taskId = bin2hex(random_bytes(16));
        $meta = [
            'action' => $action,
            'instance_id' => $id,
            'vm_type' => $vmType,
        ];

        $saved = VmTask::create([
            'task_id' => $taskId,
            'instance_id' => $id,
            'vm_node_id' => (int) $vmInstance['vm_node_id'],
            'task_type' => 'power',
            'status' => 'pending',
            'target_node' => $node,
            'vmid' => $vmid,
            'data' => $meta,
            'user_uuid' => $user['uuid'] ?? null,
        ]);

        if (!$saved) {
            return ApiResponse::error('Failed to create power task', 'DB_ERROR', 500);
        }

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id' => (int) $vmInstance['vm_node_id'],
            'user_id' => (int) $user['id'],
            'event' => 'vm:power.' . $action . '.scheduled',
            'metadata' => ['hostname' => $vmInstance['hostname'] ?? null, 'task_id' => $taskId],
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'task_id' => $taskId,
            'message' => 'Power task added to queue.',
        ], 'Action scheduled', 202);
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
            'vm_node_id' => (int) $instance['vm_node_id'],
            'user_id' => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event' => 'vm:reinstall.start',
            'metadata' => ['hostname' => $instance['hostname'] ?? null],
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'reinstall_id' => $result['reinstall_id'],
            'message' => $result['message'],
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
    public function taskStatus(Request $request, string $taskId): Response
    {
        $taskId = trim($taskId);
        if ($taskId === '') {
            return ApiResponse::error('Missing task_id', 'INVALID_ID', 400);
        }

        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $task = VmTask::getByTaskId($taskId);
        if (!$task) {
            return ApiResponse::error('Task not found', 'NOT_FOUND', 404);
        }

        $instanceId = (int) ($task['instance_id'] ?? 0);
        if ($instanceId > 0 && !VmGateway::canUserAccessVmInstance($user['uuid'], $instanceId)) {
            return ApiResponse::error('Task not found or access denied', 'NOT_FOUND', 404);
        }

        $type = $task['task_type'] ?? 'unknown';
        $status = $task['status'] ?? 'pending';

        if ($status === 'pending' || $status === 'running') {
            $msg = match ($type) {
                'delete' => 'Deletion in progress…',
                'power' => 'Power action in progress…',
                'reinstall' => 'Cloning and provisioning VM…',
                'create' => 'Provisioning new VM…',
                default => 'Processing task…',
            };

            if ($status === 'pending') {
                $msg = 'Task in queue, waiting for processing…';
            }

            return ApiResponse::success([
                'status' => $status,
                'message' => $msg,
            ], 'In progress', 200);
        }

        if ($status === 'completed') {
            $data = ['status' => 'completed'];
            if ($type === 'reinstall' || $type === 'create') {
                $data['status'] = 'active'; // Compatibility with existing frontend
                $data['instance'] = VmInstance::getById($instanceId);
            }

            return ApiResponse::success($data, 'Task completed successfully', 200);
        }

        return ApiResponse::success([
            'status' => 'failed',
            'error' => $task['error'] ?? 'Unknown error',
        ], 'Task failed', 200);
    }

    public function reinstallStatus(Request $request, string $reinstallId): Response
    {
        return $this->taskStatus($request, $reinstallId);
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
            $templates = VmTemplate::getByNodeId($nodeId);
        } else {
            $templates = VmTemplate::getAll(true);
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
            $instanceTemplate = VmTemplate::getById((int) $vmInstance['template_id']);
            if ($instanceTemplate && (($instanceTemplate['guest_type'] ?? 'qemu') === $type)) {
                $filtered = [$instanceTemplate];
            }
        }

        return ApiResponse::success(['templates' => $filtered], 'Templates retrieved', 200);
    }

    /**
     * Resolve the VM access password for owner-facing UX.
     */
    private static function resolveAccessPassword(array $vmInstance): ?string
    {
        $notesRaw = isset($vmInstance['notes']) && is_string($vmInstance['notes']) ? trim($vmInstance['notes']) : '';
        if ($notesRaw !== '') {
            $notes = json_decode($notesRaw, true);
            if (is_array($notes) && !empty($notes['ci_password']) && is_string($notes['ci_password'])) {
                return trim((string) $notes['ci_password']) !== '' ? trim((string) $notes['ci_password']) : null;
            }
        }

        $vmType = ($vmInstance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        if ($vmType === 'lxc' && !empty($vmInstance['template_id'])) {
            $template = VmTemplate::getById((int) $vmInstance['template_id']);
            if ($template && !empty($template['lxc_root_password']) && is_string($template['lxc_root_password'])) {
                return trim((string) $template['lxc_root_password']) !== '' ? trim((string) $template['lxc_root_password']) : null;
            }
        }

        return null;
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
