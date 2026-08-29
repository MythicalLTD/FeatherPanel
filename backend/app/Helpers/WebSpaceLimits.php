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

namespace App\Helpers;

/**
 * Pure helpers for WebSpace quota / async backup job sync decisions.
 */
class WebSpaceLimits
{
    /**
     * @param int $limit 0 = unlimited
     */
    public static function isLimitReached(int $limit, int $current): bool
    {
        return $limit > 0 && $current >= $limit;
    }

    /**
     * Whether a daemon backup job payload should upsert a panel backup row.
     *
     * @param array<string, mixed> $body
     */
    public static function shouldPersistBackupJob(array $body): bool
    {
        $phase = strtolower((string) ($body['phase'] ?? ''));
        if ($phase !== 'completed') {
            return false;
        }

        $operation = strtolower((string) ($body['operation'] ?? ''));
        if ($operation !== '' && $operation !== 'create' && $operation !== 'backup') {
            return false;
        }

        $backupUuid = (string) ($body['backup_uuid'] ?? $body['uuid'] ?? '');

        return $backupUuid !== '' && \App\Chat\WebSpace::isValidUuid($backupUuid);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array{uuid: string, bytes: int, checksum: ?string}|null
     */
    public static function backupJobFields(array $body): ?array
    {
        if (!self::shouldPersistBackupJob($body)) {
            return null;
        }

        return [
            'uuid' => (string) ($body['backup_uuid'] ?? $body['uuid'] ?? ''),
            'bytes' => (int) ($body['bytes'] ?? 0),
            'checksum' => isset($body['checksum']) ? (string) $body['checksum'] : null,
        ];
    }
}
