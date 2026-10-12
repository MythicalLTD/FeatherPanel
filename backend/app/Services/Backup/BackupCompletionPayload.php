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

final class BackupCompletionPayload
{
    public static function parse(array $body): ?array
    {
        if (!array_key_exists('successful', $body) || !is_bool($body['successful'])) {
            return null;
        }
        if ($body['successful'] && (!is_string($body['checksum'] ?? null) || !is_string($body['checksum_type'] ?? null) || !is_int($body['size'] ?? null) || $body['size'] < 0)) {
            return null;
        }
        $data = ['is_successful' => $body['successful'] ? 1 : 0, 'is_locked' => 0, 'completed_at' => gmdate('Y-m-d H:i:s')];
        if ($body['successful']) {
            $data['checksum'] = $body['checksum'];
            $data['bytes'] = $body['size'];
        }

        return $data;
    }
}
