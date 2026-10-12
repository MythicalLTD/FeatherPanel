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

/** Explicit recovery of abandoned metadata; never deletes or verifies an archive. */
final class StalledBackupRecovery
{
    public const STALE_AFTER_SECONDS = 86400;

    public function __construct(private \PDO $db)
    {
    }

    public static function isStale(array $backup, ?\DateTimeImmutable $now = null): bool
    {
        if (!empty($backup['completed_at']) || !empty($backup['is_successful']) || !empty($backup['deleted_at']) || empty($backup['created_at'])) {
            return false;
        }
        try {
            $created = new \DateTimeImmutable((string) $backup['created_at'], new \DateTimeZone('UTC'));
            $now ??= new \DateTimeImmutable('now', new \DateTimeZone('UTC'));

            return $now->getTimestamp() - $created->getTimestamp() >= self::STALE_AFTER_SECONDS;
        } catch (\Exception) {
            return false;
        }
    }

    /** Atomic guard prevents overwriting a concurrent node completion callback. */
    public function recover(int $backupId, int $serverId, ?\DateTimeImmutable $now = null): bool
    {
        if ($backupId <= 0 || $serverId <= 0) {
            return false;
        }
        $now = ($now ?? new \DateTimeImmutable('now'))->setTimezone(new \DateTimeZone('UTC'));
        $cutoff = $now->modify('-' . self::STALE_AFTER_SECONDS . ' seconds')->format('Y-m-d H:i:s');
        $statement = $this->db->prepare(
            'UPDATE featherpanel_server_backups SET is_successful = 0, is_locked = 0, completed_at = :completed_at, updated_at = :updated_at '
            . 'WHERE id = :id AND server_id = :server_id AND deleted_at IS NULL AND completed_at IS NULL AND is_successful = 0 AND created_at <= :cutoff'
        );
        $statement->execute([
            'completed_at' => $now->format('Y-m-d H:i:s'),
            'updated_at' => $now->format('Y-m-d H:i:s'),
            'id' => $backupId,
            'server_id' => $serverId,
            'cutoff' => $cutoff,
        ]);

        return $statement->rowCount() === 1;
    }
}
