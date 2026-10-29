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

namespace App\Services\Quota;

use App\App;
use App\Chat\Database;

/**
 * Per-user disk quota: the total disk (MiB) a user may allocate across the servers they own.
 * The panel default applies unless the user has an override; 0 means unlimited.
 * A server with disk 0 (unlimited) cannot be placed under a quota.
 */
class DiskQuota
{
    public const SETTING_DEFAULT = 'user_disk_quota_default_mb';

    public const MAX_MB = 1073741824; // 1 PiB

    public static function defaultMb(): int
    {
        return self::clamp((int) App::getInstance(true)->getConfig()->getSetting(self::SETTING_DEFAULT, '0'));
    }

    public static function setDefaultMb(int $mb): bool
    {
        return App::getInstance(true)->getConfig()->setSetting(self::SETTING_DEFAULT, (string) self::clamp($mb));
    }

    public static function clamp(int $mb): int
    {
        return max(0, min(self::MAX_MB, $mb));
    }

    /** User override (MiB, 0 = unlimited) or null when the default applies. */
    public static function overrideMb(int $userId): ?int
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT disk_quota_mb FROM featherpanel_users WHERE id = :id');
        $stmt->execute(['id' => $userId]);
        $value = $stmt->fetchColumn();

        return $value === false || $value === null ? null : (int) $value;
    }

    public static function setOverride(int $userId, ?int $mb): bool
    {
        $stmt = Database::getPdoConnection()->prepare('UPDATE featherpanel_users SET disk_quota_mb = :mb WHERE id = :id');

        return $stmt->execute(['mb' => $mb === null ? null : self::clamp($mb), 'id' => $userId]);
    }

    public static function effectiveMb(int $userId): int
    {
        return self::overrideMb($userId) ?? self::defaultMb();
    }

    /**
     * Disk the user's servers already allocate.
     *
     * @return array{allocated_mb: int, unlimited_servers: int, servers: int}
     */
    public static function allocated(int $userId, ?int $excludeServerId = null): array
    {
        $sql = 'SELECT COALESCE(SUM(disk), 0) AS total, SUM(disk = 0) AS unlimited, COUNT(*) AS servers FROM featherpanel_servers WHERE owner_id = :uid';
        $params = ['uid' => $userId];
        if ($excludeServerId !== null) {
            $sql .= ' AND id <> :sid';
            $params['sid'] = $excludeServerId;
        }
        $stmt = Database::getPdoConnection()->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: [];

        return [
            'allocated_mb' => (int) ($row['total'] ?? 0),
            'unlimited_servers' => (int) ($row['unlimited'] ?? 0),
            'servers' => (int) ($row['servers'] ?? 0),
        ];
    }

    /** @return array{quota_mb: int, source: string, allocated_mb: int, unlimited_servers: int, servers: int, remaining_mb: int|null} */
    public static function summary(int $userId): array
    {
        $override = self::overrideMb($userId);
        $quota = $override ?? self::defaultMb();
        $alloc = self::allocated($userId);

        return [
            'quota_mb' => $quota,
            'source' => $override === null ? 'default' : 'user',
            'allocated_mb' => $alloc['allocated_mb'],
            'unlimited_servers' => $alloc['unlimited_servers'],
            'servers' => $alloc['servers'],
            'remaining_mb' => $quota > 0 ? max(0, $quota - $alloc['allocated_mb']) : null,
        ];
    }

    /**
     * Check that giving a server `$diskMb` keeps the owner inside their quota.
     * Pass the server id when editing so its current size is not counted twice.
     *
     * @return array{code: string, message: string}|null null when allowed
     */
    public static function check(int $userId, int $diskMb, ?int $serverId = null): ?array
    {
        $quota = self::effectiveMb($userId);
        if ($quota <= 0) {
            return null;
        }
        if ($diskMb <= 0) {
            return [
                'code' => 'DISK_QUOTA_UNLIMITED_NOT_ALLOWED',
                'message' => 'This user has a disk quota of ' . $quota . ' MiB, so the server needs a disk limit (0 = unlimited is not allowed).',
            ];
        }
        $alloc = self::allocated($userId, $serverId);
        if ($quota < $alloc['allocated_mb'] + $diskMb) {
            return [
                'code' => 'DISK_QUOTA_EXCEEDED',
                'message' => 'This would exceed the user\'s disk quota: ' . ($alloc['allocated_mb'] + $diskMb) . ' MiB of ' . $quota . ' MiB (' . max(0, $quota - $alloc['allocated_mb']) . ' MiB left).',
            ];
        }

        return null;
    }
}
