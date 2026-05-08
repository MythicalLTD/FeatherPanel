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
use App\Services\Chatbot\Tools\ToolInterface;

/**
 * Tool to restore a VDS instance from a backup.
 * Mirrors VmUserBackupController::restoreBackup() — actually calls Proxmox.
 */
class RestoreVdsBackupTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $userUuid = $user['uuid'] ?? '';

        // Require explicit confirmation — this overwrites all data
        $confirm = $params['confirm'] ?? false;
        if ($confirm !== true) {
            return [
                'success' => false,
                'error'   => 'Please confirm the restore by passing confirm: true. This will overwrite ALL current data on the instance.',
            ];
        }

        $volid   = isset($params['volid']) ? trim((string) $params['volid']) : '';
        $storage = isset($params['storage']) ? trim((string) $params['storage']) : '';

        if ($volid === '') {
            return ['success' => false, 'error' => 'volid is required. Use get_vds_backups to list available backups.'];
        }
        if ($storage === '') {
            return ['success' => false, 'error' => 'storage is required. Use get_vds_backups to list available backups.'];
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
            return ['success' => false, 'error' => 'You do not have permission to restore backups for this VDS instance.'];
        }

        $instance = VmInstance::getById($instanceId);
        if (!$instance) {
            return ['success' => false, 'error' => "VDS instance #{$instanceId} not found."];
        }

        $hostname = $instance['hostname'] ?? "Instance #{$instanceId}";

        // Verify backup belongs to this instance
        $backup = VmInstanceBackup::getByInstanceAndVolid($instanceId, $volid);
        if (!$backup) {
            return ['success' => false, 'error' => "Backup '{$volid}' not found for this instance. Use get_vds_backups to list available backups."];
        }

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ['success' => false, 'error' => "VM node not found for instance '{$hostname}'."];
        }

        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Failed to connect to Proxmox node: ' . $e->getMessage()];
        }

        $vmid   = (int) $instance['vmid'];
        $node   = $instance['pve_node'] ?? '';
        $vmType = $instance['vm_type'] ?? 'qemu';

        if ($node === '') {
            $find = $client->findNodeByVmid($vmid);
            $node = $find['ok'] ? $find['node'] : '';
        }

        // Stop the VM first (best-effort, same as controller)
        $stopResult = $client->stopVm($node, $vmid, $vmType);
        if (!$stopResult['ok']) {
            $this->app->getLogger()->warning("RestoreVdsBackupTool: could not stop VM {$vmid} before restore: " . ($stopResult['error'] ?? 'unknown'));
        }
        sleep(3);

        // Start restore
        if ($vmType === 'qemu') {
            $result = $client->restoreQemuFromBackup($node, $vmid, $volid, $storage);
        } else {
            $result = $client->restoreLxcFromBackup($node, $vmid, $volid, $storage);
        }

        if (!$result['ok']) {
            return ['success' => false, 'error' => $result['error'] ?? 'Failed to start restore on Proxmox.'];
        }

        // Create task record
        $restoreId = bin2hex(random_bytes(16));
        VmTask::create([
            'task_id'     => $restoreId,
            'instance_id' => $instanceId,
            'vm_node_id'  => (int) $instance['vm_node_id'],
            'task_type'   => 'restore_backup',
            'status'      => 'pending',
            'upid'        => $result['upid'] ?? '',
            'target_node' => $node,
            'vmid'        => $vmid,
            'user_uuid'   => $instance['user_uuid'] ?? null,
            'data'        => [
                'type'        => 'restore_backup',
                'instance_id' => $instanceId,
                'vmid'        => $vmid,
                'node'        => $node,
                'volid'       => $volid,
                'storage'     => $storage,
            ],
        ]);

        // Log activity
        VmInstanceActivity::createActivity([
            'vm_instance_id' => $instanceId,
            'vm_node_id'     => (int) $instance['vm_node_id'],
            'user_id'        => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event'          => 'vm:backup.restore.start',
            'metadata'       => ['volid' => $volid, 'storage' => $storage, 'source' => 'chatbot'],
        ]);

        return [
            'success'        => true,
            'action_type'    => 'vds_restore_backup',
            'instance_id'    => $instanceId,
            'hostname'       => $hostname,
            'volid'          => $volid,
            'storage'        => $storage,
            'restore_id'     => $restoreId,
            'is_destructive' => true,
            'message'        => "Restore of VDS '{$hostname}' from backup '{$volid}' has been started (ID: {$restoreId}). This may take several minutes.",
        ];
    }

    public function getDescription(): string
    {
        return 'Restore a VDS instance from a backup. Destructive — overwrites all current data. Requires confirm: true. Use get_vds_backups first to find the volid and storage.';
    }

    public function getParameters(): array
    {
        return [
            'instance_id' => 'VDS instance ID (optional if currently viewing a VDS page)',
            'volid'       => 'Backup volume ID (required, from get_vds_backups)',
            'storage'     => 'Backup storage name (required, from get_vds_backups)',
            'confirm'     => 'Must be true to confirm the restore (required)',
        ];
    }
}
