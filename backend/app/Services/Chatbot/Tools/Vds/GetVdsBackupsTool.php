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
use App\Chat\VmInstanceBackup;
use App\Services\Chatbot\Tools\ToolInterface;

/**
 * Tool to list backups for a VDS instance.
 */
class GetVdsBackupsTool implements ToolInterface
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
                'backups' => [],
            ];
        }

        // Check user access
        if (!VmGateway::canUserAccessVmInstance($userUuid, $instanceId)) {
            return [
                'success' => false,
                'error'   => 'Access denied to VDS instance.',
                'backups' => [],
            ];
        }

        // Check backup permission
        if (!VmGateway::hasVmPermission($userUuid, $instanceId, 'backup')) {
            return [
                'success' => false,
                'error'   => 'You do not have permission to view backups for this VDS instance.',
                'backups' => [],
            ];
        }

        $instance = VmInstance::getById($instanceId);
        if (!$instance) {
            return [
                'success' => false,
                'error'   => "VDS instance #{$instanceId} not found.",
                'backups' => [],
            ];
        }

        $hostname = $instance['hostname'] ?? "Instance #{$instanceId}";

        // Fetch backups
        $rawBackups = VmInstanceBackup::getBackupsByInstanceId($instanceId);

        // Format backups
        $formatted = [];
        foreach ($rawBackups as $backup) {
            $sizeBytes = isset($backup['size_bytes']) ? (int) $backup['size_bytes'] : 0;
            $sizeMB = $sizeBytes > 0 ? round($sizeBytes / 1048576, 2) : null;

            $formatted[] = [
                'id'         => (int) $backup['id'],
                'volid'      => $backup['volid'] ?? null,
                'storage'    => $backup['storage'] ?? null,
                'format'     => $backup['format'] ?? null,
                'size_bytes' => $sizeBytes,
                'size_mb'    => $sizeMB,
                'ctime'      => $backup['ctime'] ?? null,
                'created_at' => $backup['created_at'] ?? null,
            ];
        }

        return [
            'success'     => true,
            'instance_id' => $instanceId,
            'hostname'    => $hostname,
            'backups'     => $formatted,
            'count'       => count($formatted),
        ];
    }

    public function getDescription(): string
    {
        return 'List backups for a VDS instance. Returns backup volume IDs, storage locations, sizes, and creation times.';
    }

    public function getParameters(): array
    {
        return [
            'instance_id' => 'VDS instance ID (optional if currently viewing a VDS page)',
        ];
    }
}
