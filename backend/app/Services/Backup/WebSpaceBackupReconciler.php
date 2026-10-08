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

use App\Chat\Database;
use App\Chat\WebSpaceBackup;

/** Repair panel metadata from the daemon's verified completed archives. */
final class WebSpaceBackupReconciler
{
    public static function sync(int $spaceId, array $archives): void
    {
        foreach ($archives as $archive) {
            if (is_array($archive) && ($archive['status'] ?? '') === 'failed' && is_string($archive['uuid'] ?? null)) {
                self::markFailed(Database::getPdoConnection(), $spaceId, $archive['uuid']);
                continue;
            }
            if (!is_array($archive) || !self::isCompletedArchive($archive)) {
                continue;
            }
            $uuid = $archive['uuid'];
            $existing = WebSpaceBackup::getByUuid($uuid);
            if ($existing && (int) $existing['webspace_id'] !== $spaceId) {
                continue;
            }
            $bytes = (int) $archive['bytes'];
            $checksum = isset($archive['checksum']) ? (string) $archive['checksum'] : null;
            if (!$existing) {
                WebSpaceBackup::create(['uuid' => $uuid, 'webspace_id' => $spaceId, 'bytes' => $bytes, 'checksum' => $checksum, 'status' => 'completed']);
            }
            if (!$existing || ($existing['status'] ?? '') !== 'completed' || (int) $existing['bytes'] !== $bytes || ($existing['checksum'] ?? null) !== $checksum) {
                WebSpaceBackup::markCompleted($uuid, $bytes, $checksum);
            }
        }
    }

    public static function markFailed(\PDO $db, int $spaceId, string $uuid): void
    {
        $q = $db->prepare("UPDATE featherpanel_webspace_backups SET status = 'failed', completed_at = CURRENT_TIMESTAMP WHERE uuid = :uuid AND webspace_id = :space AND status IN ('pending', 'running', 'creating')");
        $q->execute(['uuid' => $uuid, 'space' => $spaceId]);
    }

    public static function isCompletedArchive(array $archive): bool
    {
        // Daemons without a status field list only finished archives.
        return is_string($archive['uuid'] ?? null)
            && preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i', $archive['uuid']) === 1
            && in_array($archive['status'] ?? 'completed', ['completed', 'successful'], true)
            && isset($archive['bytes']) && is_numeric($archive['bytes']) && (int) $archive['bytes'] > 0;
    }
}
