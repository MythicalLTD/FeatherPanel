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
use App\Chat\VmInstanceActivity;
use App\Services\Vm\VmInstanceUtil;
use App\Plugins\Events\Events\VdsEvent;
use App\Services\Chatbot\Tools\ToolInterface;

/**
 * Tool to perform a power action on a VDS instance.
 * Actually creates a VmTask and queues it to Proxmox via the async runner,
 * identical to what VmUserInstanceController::powerAction() does.
 */
class VdsPowerActionTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $userUuid = $user['uuid'] ?? '';

        // Validate action
        $action = isset($params['action']) ? strtolower(trim($params['action'])) : null;
        $allowedActions = ['start', 'stop', 'reboot'];

        if (!$action) {
            return [
                'success' => false,
                'error' => 'Action is required. Valid actions: start, stop, reboot',
            ];
        }

        if (!in_array($action, $allowedActions, true)) {
            return [
                'success' => false,
                'error' => "Invalid action '{$action}'. Valid actions: start, stop, reboot",
            ];
        }

        // Resolve instance ID from params or pageContext
        $instanceId = isset($params['instance_id']) ? (int) $params['instance_id'] : 0;
        if ($instanceId <= 0 && isset($pageContext['vdsInstance'])) {
            $instanceId = (int) ($pageContext['vdsInstance']['id'] ?? 0);
        }
        if ($instanceId <= 0) {
            return [
                'success' => false,
                'error' => 'Instance ID is required. Please provide an instance_id or ensure you are viewing a VDS page.',
            ];
        }

        // Access + permission checks
        if (!VmGateway::canUserAccessVmInstance($userUuid, $instanceId)) {
            return ['success' => false, 'error' => 'Access denied to VDS instance.'];
        }
        if (!VmGateway::hasVmPermission($userUuid, $instanceId, 'power')) {
            return ['success' => false, 'error' => 'You do not have permission to perform power actions on this VDS instance.'];
        }

        $instance = VmInstance::getById($instanceId);
        if (!$instance) {
            return ['success' => false, 'error' => "VDS instance #{$instanceId} not found."];
        }

        $hostname = $instance['hostname'] ?? "Instance #{$instanceId}";

        // Get the Proxmox node
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ['success' => false, 'error' => "VM node not found for instance '{$hostname}'."];
        }

        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            $this->app->getLogger()->error('VdsPowerActionTool: Proxmox client build failed: ' . $e->getMessage());

            return ['success' => false, 'error' => 'Failed to connect to Proxmox node: ' . $e->getMessage()];
        }

        // Resolve PVE node name
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            if (!$find['ok']) {
                return ['success' => false, 'error' => 'Could not determine Proxmox node for this instance.'];
            }
            $node = $find['node'];
        }

        $vmid    = (int) $instance['vmid'];
        $vmType  = in_array($instance['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true) ? $instance['vm_type'] : 'qemu';

        // Create the task record (the async runner will execute it)
        $taskId = bin2hex(random_bytes(16));
        $saved = VmTask::create([
            'task_id'    => $taskId,
            'instance_id' => $instanceId,
            'vm_node_id' => (int) $instance['vm_node_id'],
            'task_type'  => 'power',
            'status'     => 'pending',
            'target_node' => $node,
            'vmid'       => $vmid,
            'data'       => [
                'action'      => $action,
                'instance_id' => $instanceId,
                'vm_type'     => $vmType,
            ],
            'user_uuid'  => $user['uuid'] ?? null,
        ]);

        if (!$saved) {
            return ['success' => false, 'error' => 'Failed to queue power task. Please try again.'];
        }

        // Log activity
        VmInstanceActivity::createActivity([
            'vm_instance_id' => $instanceId,
            'vm_node_id'     => (int) $instance['vm_node_id'],
            'user_id'        => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event'          => 'vm:power.' . $action . '.scheduled',
            'metadata'       => ['hostname' => $hostname, 'task_id' => $taskId, 'source' => 'chatbot'],
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(VdsEvent::onVdsPowerAction(), [
                'user_uuid' => $user['uuid'] ?? null,
                'vds_id'    => $instanceId,
                'vmid'      => $vmid,
                'action'    => $action,
                'task_id'   => $taskId,
                'context'   => ['source' => 'chatbot'],
            ]);
        }

        $actionPast = match ($action) {
            'start'  => 'started',
            'stop'   => 'stopped',
            'reboot' => 'rebooted',
            default  => $action . 'ed',
        };

        return [
            'success'      => true,
            'action_type'  => 'vds_power',
            'instance_id'  => $instanceId,
            'hostname'     => $hostname,
            'action'       => $action,
            'action_past'  => $actionPast,
            'task_id'      => $taskId,
            'is_destructive' => in_array($action, ['stop', 'reboot'], true),
            'message'      => "VDS '{$hostname}' has been {$actionPast} successfully. Task ID: {$taskId}",
        ];
    }

    public function getDescription(): string
    {
        return 'Perform a power action on a VDS instance (start, stop, or reboot). Actually queues the task to Proxmox via the async runner.';
    }

    public function getParameters(): array
    {
        return [
            'instance_id' => 'VDS instance ID (optional if currently viewing a VDS page)',
            'action'      => 'Power action to perform: start, stop, or reboot (required)',
        ];
    }
}
