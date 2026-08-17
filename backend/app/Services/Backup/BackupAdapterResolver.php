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

    /** Calagopus kebab-case name for PBS. */
    public const ADAPTER_PROXMOX_BACKUP_SERVER = 'proxmox-backup-server';

    public const ADAPTER_DDUP_BAK = 'ddup-bak';

    public const ADAPTER_BTRFS = 'btrfs';

    public const ADAPTER_ZFS = 'zfs';

    public const ADAPTER_RESTIC = 'restic';

    public const ADAPTER_KOPIA = 'kopia';

    /** @var list<string> */
    public const CALAGOPUS_ADAPTERS = [
        self::ADAPTER_WINGS,
        self::ADAPTER_S3,
        self::ADAPTER_DDUP_BAK,
        self::ADAPTER_BTRFS,
        self::ADAPTER_ZFS,
        self::ADAPTER_RESTIC,
        self::ADAPTER_PROXMOX_BACKUP_SERVER,
        self::ADAPTER_KOPIA,
    ];

    /**
     * Ask Wings which backup destination is configured as default for this node.
     * Falls back to local "wings" (tar.gz) when the endpoint is unavailable.
     */
    public static function resolveDefault(Wings $wings): string
    {
        try {
            $data = $wings->getSystem()->getBackupDestinations();
            $adapter = isset($data['default_adapter']) ? strtolower(trim((string) $data['default_adapter'])) : self::ADAPTER_WINGS;
            $adapter = self::normalizeStored($adapter);

            if (self::isPbs($adapter)) {
                $configured = !empty($data['pbs']['configured']) || !empty($data['pbs']['enabled']);
                if ($configured) {
                    return self::ADAPTER_PBS;
                }
                App::getInstance(true)->getLogger()->warning(
                    'Wings reported PBS as default backup adapter but PBS is not configured; using local wings adapter'
                );

                return self::ADAPTER_WINGS;
            }

            if ($adapter === self::ADAPTER_S3) {
                return self::ADAPTER_S3;
            }

            if (
                in_array($adapter, [
                    self::ADAPTER_DDUP_BAK,
                    self::ADAPTER_BTRFS,
                    self::ADAPTER_ZFS,
                    self::ADAPTER_RESTIC,
                    self::ADAPTER_KOPIA,
                ], true)
            ) {
                return $adapter;
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
     * Map a panel-stored adapter name to the string expected by the daemon API.
     *
     * FeatherWings uses `pbs`; Calagopus wings-rs uses `proxmox-backup-server`.
     */
    public static function toDaemonAdapter(string $adapter, Wings $wings): string
    {
        $normalized = self::normalizeStored($adapter);

        if ($wings->getConnection()->isWingsRs()) {
            if ($normalized === self::ADAPTER_PBS) {
                return self::ADAPTER_PROXMOX_BACKUP_SERVER;
            }

            return $normalized === self::ADAPTER_WINGS ? self::ADAPTER_WINGS : $normalized;
        }

        if ($normalized === self::ADAPTER_PBS || $adapter === self::ADAPTER_PROXMOX_BACKUP_SERVER) {
            return self::ADAPTER_PBS;
        }

        return $normalized;
    }

    /**
     * List adapters the node can use for backups.
     *
     * @return list<string>
     */
    public static function listAvailableAdapters(Wings $wings): array
    {
        if ($wings->getConnection()->isWingsRs()) {
            try {
                $data = $wings->getSystem()->getBackupDestinations();
                if (!empty($data['adapters']) && is_array($data['adapters'])) {
                    $list = [];
                    foreach ($data['adapters'] as $adapter) {
                        if (is_string($adapter) && $adapter !== '') {
                            $list[] = strtolower(trim($adapter));
                        }
                    }
                    if ($list !== []) {
                        return array_values(array_unique($list));
                    }
                }
                if (!empty($data['available']) && is_array($data['available'])) {
                    $list = [];
                    foreach ($data['available'] as $adapter) {
                        if (is_string($adapter) && $adapter !== '') {
                            $list[] = strtolower(trim($adapter));
                        }
                    }
                    if ($list !== []) {
                        return array_values(array_unique($list));
                    }
                }
            } catch (\Throwable $e) {
                // Fall through — do not advertise every Calagopus driver as available.
            }

            // Calagopus has no FeatherWings-style /api/system/backups; default to local wings only.
            return [self::ADAPTER_WINGS];
        }

        try {
            $data = $wings->getSystem()->getBackupDestinations();
            $list = [self::ADAPTER_WINGS];
            if (!empty($data['pbs']['configured']) || !empty($data['pbs']['enabled'])) {
                $list[] = self::ADAPTER_PBS;
            }
            if (!empty($data['s3']['configured']) || !empty($data['s3']['enabled'])) {
                $list[] = self::ADAPTER_S3;
            }

            return $list;
        } catch (\Throwable $e) {
            return [self::ADAPTER_WINGS];
        }
    }

    /**
     * Normalize a stored disk/adapter value from featherpanel_server_backups.disk.
     */
    public static function normalizeStored(mixed $disk): string
    {
        $v = strtolower(trim((string) ($disk ?? self::ADAPTER_WINGS)));
        if ($v === self::ADAPTER_PBS || $v === self::ADAPTER_PROXMOX_BACKUP_SERVER) {
            return self::ADAPTER_PBS;
        }
        if ($v === self::ADAPTER_S3) {
            return self::ADAPTER_S3;
        }
        if (
            in_array($v, [
                self::ADAPTER_DDUP_BAK,
                self::ADAPTER_BTRFS,
                self::ADAPTER_ZFS,
                self::ADAPTER_RESTIC,
                self::ADAPTER_KOPIA,
            ], true)
        ) {
            return $v;
        }

        return self::ADAPTER_WINGS;
    }

    public static function isPbs(mixed $disk): bool
    {
        return self::normalizeStored($disk) === self::ADAPTER_PBS;
    }
}
