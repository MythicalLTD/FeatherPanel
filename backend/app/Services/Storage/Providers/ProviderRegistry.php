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
        return in_array($provider, ['gdrive', 'dropbox', 'onedrive', 'sftp', 'webdav'], true);
    }

    public static function get(string $provider): StorageProviderInterface
    {
        if (isset(self::$overrides[$provider])) {
            return self::$overrides[$provider];
        }

        return match ($provider) {
            'gdrive' => new GoogleDriveProvider(),
            'dropbox' => new DropboxProvider(),
            'onedrive' => new OneDriveProvider(),
            'sftp' => new SftpProvider(),
            'webdav' => new WebDavProvider(),
            default => throw new StorageException('Unknown storage provider', 'PROVIDER_UNKNOWN', 400),
        };
    }

    /** Connected through an OAuth sign-in (not a form with credentials). */
    public static function isOAuth(string $provider): bool
    {
        return self::has($provider) && self::get($provider)->isOAuth();
    }

    /** Credentials entered by the user (SFTP, WebDAV): data is relayed through the panel. */
    public static function isRelay(string $provider): bool
    {
        return self::has($provider) && self::get($provider) instanceof RelayProvider;
    }

    public static function relay(string $provider): RelayProvider
    {
        $p = self::get($provider);
        if (!$p instanceof RelayProvider) {
            throw new StorageException('This provider is not a relay provider', 'PROVIDER_NOT_RELAY', 400);
        }

        return $p;
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
