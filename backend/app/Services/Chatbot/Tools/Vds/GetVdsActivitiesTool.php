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
use App\Chat\VmInstanceActivity;
use App\Services\Chatbot\Tools\ToolInterface;

/**
 * Tool to get the activity log for a VDS instance.
 */
class GetVdsActivitiesTool implements ToolInterface
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
                'success'    => false,
                'error'      => 'Instance ID is required. Please provide an instance_id or ensure you are viewing a VDS page.',
                'activities' => [],
            ];
        }

        // Check user access
        if (!VmGateway::canUserAccessVmInstance($userUuid, $instanceId)) {
            return [
                'success'    => false,
                'error'      => 'Access denied to VDS instance.',
                'activities' => [],
            ];
        }

        $instance = VmInstance::getById($instanceId);
        if (!$instance) {
            return [
                'success'    => false,
                'error'      => "VDS instance #{$instanceId} not found.",
                'activities' => [],
            ];
        }

        $hostname = $instance['hostname'] ?? "Instance #{$instanceId}";

        // Parse and clamp limit
        $limit = isset($params['limit']) ? (int) $params['limit'] : 20;
        if ($limit <= 0) {
            $limit = 20;
        } elseif ($limit > 50) {
            $limit = 50;
        }

        // Fetch activities
        $rawActivities = VmInstanceActivity::getActivitiesByVmInstanceId($instanceId, $limit);

        // Format activities
        $formatted = [];
        foreach ($rawActivities as $activity) {
            $metadata = null;
            if (!empty($activity['metadata'])) {
                if (is_array($activity['metadata'])) {
                    $metadata = $activity['metadata'];
                } else {
                    $decoded = json_decode($activity['metadata'], true);
                    $metadata = $decoded !== null ? $decoded : $activity['metadata'];
                }
            }

            $formatted[] = [
                'id'        => (int) $activity['id'],
                'event'     => $activity['event'],
                'timestamp' => $activity['timestamp'] ?? null,
                'metadata'  => $metadata,
                'user_id'   => isset($activity['user_id']) ? (int) $activity['user_id'] : null,
            ];
        }

        return [
            'success'     => true,
            'instance_id' => $instanceId,
            'hostname'    => $hostname,
            'activities'  => $formatted,
            'count'       => count($formatted),
        ];
    }

    public function getDescription(): string
    {
        return 'Get the activity log for a VDS instance. Returns recent events such as power actions, backups, and configuration changes.';
    }

    public function getParameters(): array
    {
        return [
            'instance_id' => 'VDS instance ID (optional if currently viewing a VDS page)',
            'limit'       => 'Maximum number of activities to return (optional, default: 20, max: 50)',
        ];
    }
}
