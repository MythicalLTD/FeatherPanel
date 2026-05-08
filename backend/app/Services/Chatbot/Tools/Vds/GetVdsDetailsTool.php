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

use App\Chat\VmInstance;
use App\Helpers\VmGateway;
use App\Services\Chatbot\Tools\ToolInterface;

/**
 * Tool to get detailed information about a VDS instance.
 */
class GetVdsDetailsTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $userUuid = $user['uuid'] ?? '';

        // Resolve instance ID: from params or from pageContext
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

        // Check user access
        if (!VmGateway::canUserAccessVmInstance($userUuid, $instanceId)) {
            return [
                'success' => false,
                'error' => 'Access denied to VDS instance.',
            ];
        }

        $instance = VmInstance::getById($instanceId);
        if (!$instance) {
            return [
                'success' => false,
                'error' => "VDS instance #{$instanceId} not found.",
            ];
        }

        // Determine the primary IP address to expose
        $ipAddress = $instance['ip_address'] ?? $instance['ip_pool_address'] ?? null;

        return [
            'success' => true,
            'instance' => [
                'id'         => (int) $instance['id'],
                'hostname'   => $instance['hostname'] ?? null,
                'status'     => $instance['status'] ?? 'unknown',
                'vm_type'    => $instance['vm_type'] ?? null,
                'ip_address' => $ipAddress,
                'memory'     => isset($instance['memory']) ? (int) $instance['memory'] : null,
                'cpus'       => isset($instance['cpus']) ? (int) $instance['cpus'] : null,
                'disk_gb'    => isset($instance['disk_gb']) ? (float) $instance['disk_gb'] : null,
                'node_name'  => $instance['node_name'] ?? null,
                'created_at' => $instance['created_at'] ?? null,
            ],
        ];
    }

    public function getDescription(): string
    {
        return 'Get detailed information about a VDS instance including hostname, status, type (QEMU/LXC), IP address, memory, CPUs, disk, and node.';
    }

    public function getParameters(): array
    {
        return [
            'instance_id' => 'VDS instance ID (optional if currently viewing a VDS page)',
        ];
    }
}
