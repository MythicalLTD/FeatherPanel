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

namespace App\Services\Storage\Providers;

use App\Services\Storage\StorageException;

/** Cloud storage providers reached through the FeatherWings "resumable" adapter. S3 is handled by S3ObjectStore. */
final class ProviderRegistry
{
    /** @var array<string, StorageProviderInterface> test overrides */
    public static array $overrides = [];

    public static function has(string $provider): bool
    {
        return in_array($provider, ['gdrive'], true);
    }

    public static function get(string $provider): StorageProviderInterface
    {
        if (isset(self::$overrides[$provider])) {
            return self::$overrides[$provider];
        }

        return match ($provider) {
            'gdrive' => new GoogleDriveProvider(),
            default => throw new StorageException('Unknown storage provider', 'PROVIDER_UNKNOWN', 400),
        };
    }

    public static function oauth(string $provider): OAuthProvider
    {
        $p = self::get($provider);
        if (!$p instanceof OAuthProvider) {
            throw new StorageException('This provider does not use OAuth', 'PROVIDER_NOT_OAUTH', 400);
        }

        return $p;
    }
}
