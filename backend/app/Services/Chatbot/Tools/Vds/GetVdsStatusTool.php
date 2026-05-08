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
 * Tool to get the current status of a VDS instance.
 */
class GetVdsStatusTool implements ToolInterface
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
                'status' => null,
            ];
        }

        // Check user access
        if (!VmGateway::canUserAccessVmInstance($userUuid, $instanceId)) {
            return [
                'success' => false,
                'error' => 'Access denied to VDS instance.',
                'status' => null,
            ];
        }

        $instance = VmInstance::getById($instanceId);
        if (!$instance) {
            return [
                'success' => false,
                'error' => "VDS instance #{$instanceId} not found.",
                'status' => null,
            ];
        }

        $status = $instance['status'] ?? 'unknown';
        $hostname = $instance['hostname'] ?? "Instance #{$instanceId}";

        return [
            'success'     => true,
            'instance_id' => (int) $instance['id'],
            'hostname'    => $hostname,
            'status'      => $status,
            'vm_type'     => $instance['vm_type'] ?? null,
        ];
    }

    public function getDescription(): string
    {
        return 'Get the current status of a VDS instance (running, stopped, suspended, etc.) from the database.';
    }

    public function getParameters(): array
    {
        return [
            'instance_id' => 'VDS instance ID (optional if currently viewing a VDS page)',
        ];
    }
}
