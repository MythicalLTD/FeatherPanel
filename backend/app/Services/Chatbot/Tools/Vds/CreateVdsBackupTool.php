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

namespace App\Services\Chatbot\Tools\Vds;

use App\App;
use App\Chat\VmNode;
use App\Chat\VmTask;
use App\Chat\VmInstance;
use App\Helpers\VmGateway;
use App\Chat\VmInstanceBackup;
use App\Chat\VmInstanceActivity;
use App\Services\Vm\VmInstanceUtil;
use App\Plugins\Events\Events\VdsEvent;
use App\Services\Backup\BackupFifoEviction;
use App\Services\Chatbot\Tools\ToolInterface;

/**
 * Tool to create a backup of a VDS instance.
 * Mirrors VmUserBackupController::createBackup() — actually calls Proxmox.
 */
class CreateVdsBackupTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $userUuid = $user['uuid'] ?? '';

        // Require explicit confirmation to prevent accidental backups
        $confirm = $params['confirm'] ?? false;
        if ($confirm !== true) {
            return [
                'success' => false,
                'error'   => 'Please confirm the backup creation by passing confirm: true. Creating a backup may take several minutes.',
            ];
        }

        // Resolve instance ID
        $instanceId = isset($params['instance_id']) ? (int) $params['instance_id'] : 0;
        if ($instanceId <= 0 && isset($pageContext['vdsInstance'])) {
            $instanceId = (int) ($pageContext['vdsInstance']['id'] ?? 0);
        }
        if ($instanceId <= 0) {
            return ['success' => false, 'error' => 'Instance ID is required.'];
        }

        // Access + permission checks
        if (!VmGateway::canUserAccessVmInstance($userUuid, $instanceId)) {
            return ['success' => false, 'error' => 'Access denied to VDS instance.'];
        }
        if (!VmGateway::hasVmPermission($userUuid, $instanceId, 'backup')) {
            return ['success' => false, 'error' => 'You do not have permission to create backups for this VDS instance.'];
        }

        $instance = VmInstance::getById($instanceId);
        if (!$instance) {
            return ['success' => false, 'error' => "VDS instance #{$instanceId} not found."];
        }

        $hostname = $instance['hostname'] ?? "Instance #{$instanceId}";

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ['success' => false, 'error' => "VM node not found for instance '{$hostname}'."];
        }

        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Failed to connect to Proxmox node: ' . $e->getMessage()];
        }

        $node  = $instance['pve_node'] ?? '';
        $vmid  = (int) $instance['vmid'];
        $vmType = $instance['vm_type'] ?? 'qemu';

        if ($node === '') {
            $find = $client->findNodeByVmid($vmid);
            $node = $find['ok'] ? $find['node'] : '';
        }

        // Pick backup storage (prefer node default)
        $storage = '';
        if ($node !== '') {
            $storagesRes = $client->getBackupStorages($node);
            if (!$storagesRes['ok'] || empty($storagesRes['storages'])) {
                return ['success' => false, 'error' => 'No backup-capable storage found on the Proxmox node.'];
            }
            $preferred = isset($vmNode['storage_backups']) ? trim((string) $vmNode['storage_backups']) : '';
            if ($preferred !== '' && in_array($preferred, $storagesRes['storages'], true)) {
                $storage = $preferred;
            } else {
                $storage = $storagesRes['storages'][0];
            }
        }

        if ($storage === '') {
            return ['success' => false, 'error' => 'No backup storage could be determined.'];
        }

        // Check backup limit (0 = disabled)
        $backupLimit   = (int) ($instance['backup_limit'] ?? 0);
        $existingCount = VmInstanceBackup::countByInstanceId((int) $instance['id']);

        if ($backupLimit === 0) {
            return ['success' => false, 'error' => 'Backups are disabled for this VM instance.'];
        }

        if ($existingCount >= $backupLimit) {
            if (!BackupFifoEviction::isFifoRollingForVm($instance)) {
                return ['success' => false, 'error' => "Backup limit of {$backupLimit} reached. Delete an existing backup first."];
            }
            $evict = BackupFifoEviction::evictOldestVmBackup($instance, $client);
            if ($evict !== null) {
                return ['success' => false, 'error' => $evict['message'] ?? 'Failed to evict oldest backup.'];
            }
        }

        // LXC cannot use snapshot mode
        $mode     = ($vmType === 'lxc') ? 'suspend' : 'snapshot';
        $compress = 'zstd';

        $result = $client->createVmBackup($node, $vmid, $storage, $compress, $mode);
        if (!$result['ok']) {
            return ['success' => false, 'error' => $result['error'] ?? 'Failed to start backup on Proxmox.'];
        }

        // Create task record
        $backupId = bin2hex(random_bytes(16));
        VmTask::create([
            'task_id'     => $backupId,
            'instance_id' => $instanceId,
            'vm_node_id'  => (int) $instance['vm_node_id'],
            'task_type'   => 'backup',
            'status'      => 'pending',
            'upid'        => $result['upid'] ?? '',
            'target_node' => $node,
            'vmid'        => $vmid,
            'user_uuid'   => $instance['user_uuid'] ?? null,
            'data'        => ['type' => 'backup', 'instance_id' => $instanceId, 'vmid' => $vmid, 'node' => $node, 'storage' => $storage],
        ]);

        // Log activity
        VmInstanceActivity::createActivity([
            'vm_instance_id' => $instanceId,
            'vm_node_id'     => (int) $instance['vm_node_id'],
            'user_id'        => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event'          => 'vm:backup.start',
            'metadata'       => ['vmid' => $vmid, 'source' => 'chatbot'],
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(VdsEvent::onVdsBackupCreated(), [
                'user_uuid' => $user['uuid'] ?? null,
                'vds_id'    => $instanceId,
                'vmid'      => $vmid,
                'backup_id' => $backupId,
                'context'   => ['source' => 'chatbot', 'storage' => $storage],
            ]);
        }

        return [
            'success'        => true,
            'action_type'    => 'vds_create_backup',
            'instance_id'    => $instanceId,
            'hostname'       => $hostname,
            'backup_id'      => $backupId,
            'storage'        => $storage,
            'is_destructive' => false,
            'message'        => "Backup of VDS '{$hostname}' has been started (ID: {$backupId}). It may take several minutes to complete.",
        ];
    }

    public function getDescription(): string
    {
        return 'Create a backup of a VDS instance. Requires confirm: true. Actually calls Proxmox to start the backup.';
    }

    public function getParameters(): array
    {
        return [
            'instance_id' => 'VDS instance ID (optional if currently viewing a VDS page)',
            'confirm'     => 'Must be true to confirm backup creation',
        ];
    }
}
