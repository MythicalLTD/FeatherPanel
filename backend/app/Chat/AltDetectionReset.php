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

namespace App\Chat;

use App\App;

/**
 * Alt detection reset markers. IP based alt links only count evidence newer
 * than the latest reset of either user (or the global reset), so clearing a
 * user hides their old shared IPs in both directions without deleting logs.
 */
class AltDetectionReset
{
    public const TABLE = 'featherpanel_alt_detection_resets';
    public const GLOBAL_KEY = '__global__';
    public const EPOCH = '1970-01-02 00:00:00';

    public static function markUser(string $userUuid): bool
    {
        return self::mark($userUuid);
    }

    public static function markAll(): bool
    {
        return self::mark(self::GLOBAL_KEY);
    }

    /**
     * Effective cutoff for a user: the later of their own and the global reset.
     */
    public static function cutoffFor(string $userUuid): ?string
    {
        try {
            $stmt = Database::getPdoConnection()->prepare(
                'SELECT MAX(reset_at) FROM ' . self::TABLE . ' WHERE user_uuid IN (?, ?)'
            );
            $stmt->execute([$userUuid, self::GLOBAL_KEY]);
            $value = $stmt->fetchColumn();

            return is_string($value) && $value !== '' ? $value : null;
        } catch (\PDOException $e) {
            return null;
        }
    }

    private static function mark(string $key): bool
    {
        try {
            $stmt = Database::getPdoConnection()->prepare(
                'INSERT INTO ' . self::TABLE . ' (user_uuid, reset_at) VALUES (?, NOW())
                 ON DUPLICATE KEY UPDATE reset_at = NOW()'
            );

            return $stmt->execute([$key]);
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to store alt detection reset: ' . $e->getMessage());

            return false;
        }
    }
}
