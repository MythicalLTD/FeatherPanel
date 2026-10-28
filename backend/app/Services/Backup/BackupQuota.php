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

use App\Chat\Backup;
use App\Services\Storage\StorageSettings;

/**
 * Which backups use up a server's backup_limit.
 *
 * Backups on the host's storage (node disk, panel-managed S3, other node adapters) always count.
 * Backups on a user's own storage (destination_id set) cost the host nothing, so by default they
 * do not count and are never rotated out; admins can make them count with backup_byo_count_toward_limit.
 *
 * Rotation (FIFO) only ever evicts a backup from the same storage pool as the new backup: the host
 * pool, or the same user destination. A host backup is never deleted to make room for a BYO one,
 * or the other way around.
 */
final class BackupQuota
{
    public static function byoCountsTowardLimit(): bool
    {
        return StorageSettings::bool(StorageSettings::BYO_COUNT_TOWARD_LIMIT);
    }

    public static function countsTowardLimit(?int $destinationId): bool
    {
        return self::counts($destinationId, self::byoCountsTowardLimit());
    }

    /** Pure rule: host backups always count, BYO backups only when the admin setting says so. */
    public static function counts(?int $destinationId, bool $byoCounts): bool
    {
        return $destinationId === null || $destinationId <= 0 || $byoCounts;
    }

    /** Backups of the server that use up its backup_limit. */
    public static function usedSlots(int $serverId): int
    {
        return Backup::countForServer($serverId, !self::byoCountsTowardLimit());
    }

    /**
     * True when creating a backup on this pool needs a free slot that is not there
     * (the caller then rotates or refuses). Never true for uncounted BYO backups.
     */
    public static function atLimit(array $server, ?int $destinationId): bool
    {
        $limit = (int) ($server['backup_limit'] ?? 0);
        if ($limit <= 0 || !self::countsTowardLimit($destinationId)) {
            return false;
        }

        return self::usedSlots((int) $server['id']) >= $limit;
    }

    /**
     * Numbers for the UI / API: how many backups count and against which limit.
     *
     * @return array{used: int, limit: int, total: int, byo_counts_toward_limit: bool, byo_enabled: bool}
     */
    public static function usage(array $server): array
    {
        return [
            'used' => self::usedSlots((int) $server['id']),
            'limit' => (int) ($server['backup_limit'] ?? 0),
            'total' => Backup::countForServer((int) $server['id'], false),
            'byo_counts_toward_limit' => self::byoCountsTowardLimit(),
            'byo_enabled' => StorageSettings::byoEnabled(),
        ];
    }
}
