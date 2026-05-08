<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studio
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
use App\Chat\VmInstance;
use App\Chat\VmInstanceActivity;
use App\Chat\VmInstanceBackup;
use App\Helpers\VmGateway;
use App\Services\Vm\VmInstanceUtil;
use App\Services\Chatbot\Tools\ToolInterface;

/**
 * Tool to delete a specific VDS backup.
 * Mirrors VmUserBackupController::deleteBackup() — actually calls Proxmox.
 */
class DeleteVdsBackupTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $userUuid = $user['uuid'] ?? '';

        $volid   = isset($params['volid'])   ? trim((string) $params['volid'])   : '';
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
            return ['success' => false, 'error' => 'You do not have permission to manage backups for this VDS instance.'];
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
        if ($vmNode) {
            try {
                $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
                $node   = $instance['pve_node'] ?? '';
                if ($node !== '') {
                    $result = $client->deleteBackupVolume($node, (string) $backup['storage'], (string) $backup['volid']);
                    if (!$result['ok']) {
                        return ['success' => false, 'error' => $result['error'] ?? 'Failed to delete backup on Proxmox.'];
                    }
                }
            } catch (\Throwable $e) {
                $this->app->getLogger()->error('DeleteVdsBackupTool: Proxmox error: ' . $e->getMessage());

                return ['success' => false, 'error' => 'Failed to connect to Proxmox node: ' . $e->getMessage()];
            }
        }

        // Remove from DB
        if (isset($backup['id']) && (int) $backup['id'] > 0) {
            VmInstanceBackup::deleteById((int) $backup['id']);
        }

        // Log activity
        VmInstanceActivity::createActivity([
            'vm_instance_id' => $instanceId,
            'vm_node_id'     => (int) $instance['vm_node_id'],
            'user_id'        => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event'          => 'vm:backup.delete',
            'metadata'       => ['volid' => $volid, 'storage' => $storage, 'source' => 'chatbot'],
        ]);

        return [
            'success'        => true,
            'action_type'    => 'vds_delete_backup',
            'instance_id'    => $instanceId,
            'hostname'       => $hostname,
            'volid'          => $volid,
            'storage'        => $storage,
            'is_destructive' => true,
            'message'        => "Backup '{$volid}' for VDS '{$hostname}' has been permanently deleted.",
        ];
    }

    public function getDescription(): string
    {
        return 'Delete a specific VDS backup. Irreversible. Use get_vds_backups first to get the volid and storage values.';
    }

    public function getParameters(): array
    {
        return [
            'instance_id' => 'VDS instance ID (optional if currently viewing a VDS page)',
            'volid'       => 'Backup volume ID (required, from get_vds_backups)',
            'storage'     => 'Backup storage name (required, from get_vds_backups)',
        ];
    }
}
