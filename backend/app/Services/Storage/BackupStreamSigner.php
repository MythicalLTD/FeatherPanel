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

namespace App\Services\Storage;

use App\App;
use App\Helpers\AppUrlHelper;

/**
 * Short-lived signed links to the panel's backup stream route, for providers without direct
 * browser download links (Google Drive needs a bearer token, which must not reach the browser).
 */
final class BackupStreamSigner
{
    public static function url(string $backupUuid, ?int $ttl = null): string
    {
        $expires = time() + ($ttl ?? StorageSettings::presignTtlSeconds());

        return AppUrlHelper::baseUrl() . '/api/storage/backups/' . rawurlencode($backupUuid) . '/download?expires=' . $expires . '&signature=' . self::sign($backupUuid, $expires);
    }

    public static function verify(string $backupUuid, mixed $expires, mixed $signature): bool
    {
        if (!is_string($signature) || !is_numeric($expires) || (int) $expires < time()) {
            return false;
        }

        return hash_equals(self::sign($backupUuid, (int) $expires), $signature);
    }

    /** Upload URL for the SFTP / WebDAV relay (Wings PUTs Content-Range chunks to it). */
    public static function relayUrl(string $backupUuid, int $ttl = 86400): string
    {
        $expires = time() + $ttl;

        return AppUrlHelper::baseUrl() . '/api/storage/relay/' . rawurlencode($backupUuid) . '?expires=' . $expires . '&signature=' . self::sign('relay|' . $backupUuid, $expires);
    }

    public static function verifyRelay(string $backupUuid, mixed $expires, mixed $signature): bool
    {
        if (!is_string($signature) || !is_numeric($expires) || (int) $expires < time()) {
            return false;
        }

        return hash_equals(self::sign('relay|' . $backupUuid, (int) $expires), $signature);
    }

    private static function sign(string $backupUuid, int $expires): string
    {
        $key = (string) (App::env('DATABASE_ENCRYPTION_KEY') ?? '');
        if ($key === '') {
            throw new StorageException('The panel has no encryption key', 'ENCRYPTION_KEY_MISSING', 500);
        }

        return hash_hmac('sha256', 'backup-stream|' . $backupUuid . '|' . $expires, $key);
    }
}
