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

use App\Chat\VmSubuser;
use App\Chat\VmInstance;
use App\Helpers\VmGateway;
use App\Services\Chatbot\Tools\ToolInterface;

/**
 * Tool to list subusers who have access to a VDS instance.
 */
class GetVdsSubusersTool implements ToolInterface
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
                'success'  => false,
                'error'    => 'Instance ID is required. Please provide an instance_id or ensure you are viewing a VDS page.',
                'subusers' => [],
            ];
        }

        // Check user access
        if (!VmGateway::canUserAccessVmInstance($userUuid, $instanceId)) {
            return [
                'success'  => false,
                'error'    => 'Access denied to VDS instance.',
                'subusers' => [],
            ];
        }

        $instance = VmInstance::getById($instanceId);
        if (!$instance) {
            return [
                'success'  => false,
                'error'    => "VDS instance #{$instanceId} not found.",
                'subusers' => [],
            ];
        }

        $hostname = $instance['hostname'] ?? "Instance #{$instanceId}";

        // Fetch all subusers - getSubusersByVmInstance() already JOINs the users table
        $rawSubusers = VmSubuser::getSubusersByVmInstance($instanceId);

        // Format subuser list, decoding permissions JSON
        $formatted = [];
        foreach ($rawSubusers as $subuser) {
            $permissions = [];
            if (!empty($subuser['permissions'])) {
                $decoded = is_array($subuser['permissions'])
                    ? $subuser['permissions']
                    : json_decode((string) $subuser['permissions'], true);
                if (is_array($decoded)) {
                    $permissions = $decoded;
                }
            }

            $formatted[] = [
                'id'          => (int) $subuser['id'],
                'user_id'     => isset($subuser['user_id']) ? (int) $subuser['user_id'] : null,
                'username'    => $subuser['username'] ?? null,
                'email'       => $subuser['email'] ?? null,
                'first_name'  => $subuser['first_name'] ?? null,
                'last_name'   => $subuser['last_name'] ?? null,
                'permissions' => $permissions,
                'created_at'  => $subuser['created_at'] ?? null,
            ];
        }

        return [
            'success'     => true,
            'instance_id' => $instanceId,
            'hostname'    => $hostname,
            'subusers'    => $formatted,
            'count'       => count($formatted),
        ];
    }

    public function getDescription(): string
    {
        return 'Get the list of subusers who have access to a VDS instance, including their usernames, emails, and assigned permissions.';
    }

    public function getParameters(): array
    {
        return [
            'instance_id' => 'VDS instance ID (optional if currently viewing a VDS page)',
        ];
    }
}
