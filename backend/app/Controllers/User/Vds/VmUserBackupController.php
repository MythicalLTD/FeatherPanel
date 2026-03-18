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
use App\Chat\VmTask;
use App\Chat\VmInstance;
use App\Helpers\VmGateway;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\VmInstanceBackup;
use App\Chat\VmInstanceActivity;
use App\Services\Vm\VmInstanceUtil;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * User VM backups: list, create, poll status, delete, restore, poll restore status.
 * Respects instance backup_limit and user/subuser access.
 */
#[OA\Tag(name: 'User - VM Backups', description: 'List, create, delete, and restore VM backups (client area). Backup limit enforced per instance.')]
class VmUserBackupController
{
    #[OA\Get(
        path: '/api/user/vm-instances/{id}/backups',
        summary: 'List VM backups',
        description: 'List backups for this VM instance. Returns backups, backup_limit (max allowed), and available Proxmox storages. Respects instance backup limit.',
        tags: ['User - VM Backups'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'VM instance ID'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Backups listed',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'backups', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'backup_limit', type: 'integer', description: 'Max backups allowed for this instance'),
                        new OA\Property(property: 'storages', type: 'array', items: new OA\Items(type: 'string'), description: 'Available backup storages on node'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
        ]
    )]
    public function listBackups(Request $request, int $id): Response
    {
        $vmInstance = $request->attributes->get('vmInstance');
        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $user = $request->attributes->get('user');
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'backup')) {
            return ApiResponse::error('You do not have permission to manage backups for this VM', 'PERMISSION_DENIED', 403);
        }

        $backups = VmInstanceBackup::getBackupsByInstanceId((int) $vmInstance['id']);
        $storages = [];
        $vmNode = VmNode::getVmNodeById((int) $vmInstance['vm_node_id']);
        if ($vmNode) {
            try {
                $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
                $node = $vmInstance['pve_node'] ?? '';
                if ($node === '') {
                    $find = $client->findNodeByVmid((int) $vmInstance['vmid']);
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
            'backup_limit' => (int) ($vmInstance['backup_limit'] ?? 5),
            'storages'     => $storages,
        ], 'Backups listed', 200);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/backups',
        summary: 'Create VM backup',
        description: 'Start an async vzdump backup. Returns 202 with backup_id. Poll GET /api/user/vm-instances/backup-status/{backupId} until status is done or failed. Fails with 422 if backup limit reached.',
        tags: ['User - VM Backups'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'storage', type: 'string', nullable: true, description: 'Proxmox storage (optional)'),
                    new OA\Property(property: 'compress', type: 'string', nullable: true, default: 'zstd'),
                    new OA\Property(property: 'mode', type: 'string', nullable: true, enum: ['snapshot', 'suspend', 'stop'], default: 'snapshot'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 202, description: 'Backup started', content: new OA\JsonContent(properties: [new OA\Property(property: 'backup_id', type: 'string')])),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM not found'),
            new OA\Response(response: 422, description: 'Backup limit reached'),
            new OA\Response(response: 500, description: 'Proxmox error'),
        ]
    )]
    public function createBackup(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $instance = $request->attributes->get('vmInstance');
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'backup')) {
            return ApiResponse::error('You do not have permission to create backups for this VM', 'PERMISSION_DENIED', 403);
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

        if ($node === '') {
            $find = $client->findNodeByVmid($vmid);
            $node = $find['ok'] ? $find['node'] : '';
        }
        if ($storage === '' && $node !== '') {
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
        $targetNode = $node !== '' ? $node : (string) ($instance['pve_node'] ?? '');
        $vmNodeId   = (int) ($instance['vm_node_id'] ?? 0);

        VmTask::create([
            'task_id'     => $backupId,
            'instance_id' => $id,
            'vm_node_id'  => $vmNodeId,
            'task_type'   => 'backup',
            'status'      => 'pending',
            'upid'        => $result['upid'],
            'target_node' => $targetNode,
            'vmid'        => $vmid,
            'user_uuid'   => $instance['user_uuid'] ?? null,
            'data'        => [
                'type'        => 'backup',
                'instance_id' => $id,
                'vmid'        => $vmid,
                'node'        => $targetNode,
                'storage'     => $storage,
            ],
        ]);

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id'     => (int) $instance['vm_node_id'],
            'user_id'        => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event'          => 'vm:backup.start',
            'metadata'       => ['vmid' => $vmid],
            'ip'             => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['backup_id' => $backupId], 'Backup started', 202);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/backup-status/{backupId}',
        summary: 'Poll backup status',
        description: 'Poll until status is done or failed. Use backup_id from create backup response.',
        tags: ['User - VM Backups'],
        parameters: [
            new OA\Parameter(name: 'backupId', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Status (running | done | failed)', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'status', type: 'string', enum: ['running', 'done', 'failed']),
                new OA\Property(property: 'error', type: 'string', nullable: true),
            ])),
            new OA\Response(response: 400, description: 'Invalid task'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Not found or access denied'),
        ]
    )]
    public function backupStatus(Request $request, string $backupId): Response
    {
        $backupId = trim($backupId);
        if ($backupId === '') {
            return ApiResponse::error('Missing backup_id', 'INVALID_ID', 400);
        }

        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $task = VmTask::getByTaskId($backupId);
        if (!$task) {
            return ApiResponse::error('Backup task not found', 'NOT_FOUND', 404);
        }
        if (($task['task_type'] ?? '') !== 'backup') {
            return ApiResponse::error('Invalid backup task', 'INVALID_TASK', 400);
        }

        $instanceId = (int) ($task['instance_id'] ?? 0);
        if ($instanceId <= 0 || !VmGateway::canUserAccessVmInstance($user['uuid'], $instanceId)) {
            return ApiResponse::error('Backup not found or access denied', 'NOT_FOUND', 404);
        }

        // If it's still running or pending, return running
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
        path: '/api/user/vm-instances/{id}/backups',
        summary: 'Delete VM backup',
        description: 'Delete a backup volume. Request body: volid and storage (from list backups).',
        tags: ['User - VM Backups'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['volid', 'storage'],
                properties: [
                    new OA\Property(property: 'volid', type: 'string'),
                    new OA\Property(property: 'storage', type: 'string'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Backup deleted'),
            new OA\Response(response: 400, description: 'Missing volid or storage'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden or backup does not belong to this VM'),
            new OA\Response(response: 404, description: 'VM not found'),
        ]
    )]
    public function deleteBackup(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $instance = $request->attributes->get('vmInstance');
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'backup')) {
            return ApiResponse::error('You do not have permission to delete backups for this VM', 'PERMISSION_DENIED', 403);
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

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id'     => (int) $instance['vm_node_id'],
            'user_id'        => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event'          => 'vm:backup.delete',
            'metadata'       => ['volid' => $volid],
            'ip'             => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Backup deleted', 200);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/backups/restore',
        summary: 'Restore VM from backup',
        description: 'Start async restore from a backup. Returns 202 with restore_id. Poll GET /api/user/vm-instances/restore-status/{restoreId} until status is active or failed.',
        tags: ['User - VM Backups'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['volid', 'storage'],
                properties: [
                    new OA\Property(property: 'volid', type: 'string'),
                    new OA\Property(property: 'storage', type: 'string'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 202, description: 'Restore started', content: new OA\JsonContent(properties: [new OA\Property(property: 'restore_id', type: 'string')])),
            new OA\Response(response: 400, description: 'Missing volid or storage'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM not found'),
            new OA\Response(response: 500, description: 'Proxmox error'),
        ]
    )]
    public function restoreBackup(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $instance = $request->attributes->get('vmInstance');
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'backup')) {
            return ApiResponse::error('You do not have permission to restore backups for this VM', 'PERMISSION_DENIED', 403);
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
        if ($node === '') {
            $find = $client->findNodeByVmid($vmid);
            $node = $find['ok'] ? $find['node'] : '';
        }

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

        VmTask::create([
            'task_id'     => $restoreId,
            'instance_id' => $id,
            'vm_node_id'  => (int) $instance['vm_node_id'],
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

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id'     => (int) $instance['vm_node_id'],
            'user_id'        => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event'          => 'vm:restore.start',
            'metadata'       => ['volid' => $volid],
            'ip'             => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['restore_id' => $restoreId], 'Restore started', 202);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/restore-status/{restoreId}',
        summary: 'Poll restore status',
        description: 'Poll until status is active or failed. Use restore_id from restore backup response.',
        tags: ['User - VM Backups'],
        parameters: [
            new OA\Parameter(name: 'restoreId', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Status (restoring | active | failed)', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'status', type: 'string', enum: ['restoring', 'active', 'failed']),
                new OA\Property(property: 'instance', type: 'object', nullable: true),
                new OA\Property(property: 'error', type: 'string', nullable: true),
            ])),
            new OA\Response(response: 400, description: 'Invalid task'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Not found or access denied'),
        ]
    )]
    public function restoreBackupStatus(Request $request, string $restoreId): Response
    {
        $restoreId = trim($restoreId);
        if ($restoreId === '') {
            return ApiResponse::error('Missing restore_id', 'INVALID_ID', 400);
        }

        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        // We don't need the client here, as the task status is already updated by the worker
        // when the Proxmox task completes.
        try {
            // $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $task = VmTask::getByTaskId($restoreId);
        if (!$task) {
            return ApiResponse::error('Restore task not found', 'NOT_FOUND', 404);
        }
        if (($task['task_type'] ?? '') !== 'restore_backup') {
            return ApiResponse::error('Invalid restore task', 'INVALID_TASK', 400);
        }

        $instanceId = (int) ($task['instance_id'] ?? 0);
        if ($instanceId <= 0 || !VmGateway::canUserAccessVmInstance($user['uuid'], $instanceId)) {
            return ApiResponse::error('Restore not found or access denied', 'NOT_FOUND', 404);
        }

        if ($task['status'] === 'pending' || $task['status'] === 'running') {
            return ApiResponse::success(['status' => 'restoring'], 'Restore in progress', 200);
        }

        if ($task['status'] === 'completed') {
            $instance = VmInstance::getById($instanceId);

            return ApiResponse::success(['status' => 'active', 'instance' => $instance], 'Restore completed', 200);
        }

        return ApiResponse::success([
            'status' => 'failed',
            'error'  => $task['error'] ?? 'Unknown error',
        ], 'Restore failed', 200);
    }
}
