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

use App\Chat\VmInstance;
use App\Helpers\VmGateway;
use App\Services\Chatbot\Tools\ToolInterface;

/**
 * Tool to get networking information for a VDS instance.
 *
 * Returns IP address and network configuration from the database.
 */
class GetVdsNetworkingTool implements ToolInterface
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
                'error'   => 'Instance ID is required. Please provide an instance_id or ensure you are viewing a VDS page.',
            ];
        }

        // Check user access
        if (!VmGateway::canUserAccessVmInstance($userUuid, $instanceId)) {
            return [
                'success' => false,
                'error'   => 'Access denied to VDS instance.',
            ];
        }

        $instance = VmInstance::getById($instanceId);
        if (!$instance) {
            return [
                'success' => false,
                'error'   => "VDS instance #{$instanceId} not found.",
            ];
        }

        $hostname = $instance['hostname'] ?? "Instance #{$instanceId}";

        // Primary IP: prefer direct ip_address, fallback to ip_pool_address
        $primaryIp = $instance['ip_address'] ?? $instance['ip_pool_address'] ?? null;

        // Build CIDR string if pool data is available
        $ipCidr = null;
        if (!empty($instance['ip_pool_address']) && !empty($instance['ip_pool_cidr'])) {
            $ipCidr = $instance['ip_pool_address'] . '/' . $instance['ip_pool_cidr'];
        }

        return [
            'success'          => true,
            'instance_id'      => $instanceId,
            'hostname'         => $hostname,
            'vm_type'          => $instance['vm_type'] ?? null,
            'vmid'             => isset($instance['vmid']) ? (int) $instance['vmid'] : null,
            'node'             => $instance['node_name'] ?? null,
            'ip_address'       => $primaryIp,
            'ip_pool_address'  => $instance['ip_pool_address'] ?? null,
            'ip_pool_cidr'     => $instance['ip_pool_cidr'] ?? null,
            'ip_cidr'          => $ipCidr,
            'ip_pool_gateway'  => $instance['ip_pool_gateway'] ?? null,
        ];
    }

    public function getDescription(): string
    {
        return 'Get networking information for a VDS instance including IP address, CIDR, gateway, VM type, VMID, and Proxmox node.';
    }

    public function getParameters(): array
    {
        return [
            'instance_id' => 'VDS instance ID (optional if currently viewing a VDS page)',
        ];
    }
}
