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

namespace App\Services\Backup;

use App\App;
use App\Services\Wings\Wings;

/**
 * Resolves the Wings backup adapter for a node (local wings vs Proxmox Backup Server).
 */
final class BackupAdapterResolver
{
    public const ADAPTER_WINGS = 'wings';

    public const ADAPTER_PBS = 'pbs';

    public const ADAPTER_S3 = 's3';

    /**
     * Ask Wings which backup destination is configured as default for this node.
     * Falls back to local "wings" (tar.gz) when the endpoint is unavailable.
     */
    public static function resolveDefault(Wings $wings): string
    {
        try {
            $data = $wings->getSystem()->getBackupDestinations();
            $adapter = isset($data['default_adapter']) ? strtolower(trim((string) $data['default_adapter'])) : self::ADAPTER_WINGS;
            if ($adapter === self::ADAPTER_PBS) {
                $configured = !empty($data['pbs']['configured']) || !empty($data['pbs']['enabled']);
                if ($configured) {
                    return self::ADAPTER_PBS;
                }
                App::getInstance(true)->getLogger()->warning(
                    'Wings reported PBS as default backup adapter but PBS is not configured; using local wings adapter'
                );

                return self::ADAPTER_WINGS;
            }

            return self::ADAPTER_WINGS;
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning(
                'Failed to resolve Wings backup destination, defaulting to local wings: ' . $e->getMessage()
            );

            return self::ADAPTER_WINGS;
        }
    }

    /**
     * Normalize a stored disk/adapter value from featherpanel_server_backups.disk.
     */
    public static function normalizeStored(mixed $disk): string
    {
        $v = strtolower(trim((string) ($disk ?? self::ADAPTER_WINGS)));
        if ($v === self::ADAPTER_PBS) {
            return self::ADAPTER_PBS;
        }
        if ($v === self::ADAPTER_S3) {
            return self::ADAPTER_S3;
        }

        return self::ADAPTER_WINGS;
    }

    public static function isPbs(mixed $disk): bool
    {
        return self::normalizeStored($disk) === self::ADAPTER_PBS;
    }
}
