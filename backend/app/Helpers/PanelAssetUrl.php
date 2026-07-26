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
 * Rewrites legacy FeatherCloud CDN icon URLs to this panel's proxy so browsers load them same-origin.
 * New Mythic product icons that already use absolute non-api.featherpanel.com URLs pass through unchanged.
 */
class PanelAssetUrl
{
    /** @var list<string> */
    private const CLOUD_STORAGE_ICON_PREFIXES = [
        'https://api.featherpanel.com/storage/icons/',
        'http://api.featherpanel.com/storage/icons/',
    ];

    /** @deprecated Legacy icon CDN; Mythic marketplace icons typically use absolute CDN URLs. */
    private const UPSTREAM_BASE = 'https://api.featherpanel.com/storage/icons/';

    public static function upstreamBase(): string
    {
        return self::UPSTREAM_BASE;
    }

    /**
     * @return non-falsy-string|null
     */
    public static function rewriteCloudStorageIcon(?string $icon): ?string
    {
        if ($icon === null) {
            return null;
        }
        $icon = trim($icon);
        if ($icon === '') {
            return null;
        }

        foreach (self::CLOUD_STORAGE_ICON_PREFIXES as $prefix) {
            if (str_starts_with($icon, $prefix)) {
                $path = (string) (parse_url($icon, PHP_URL_PATH) ?? '');
                $file = basename($path);
                if ($file !== '' && self::isSafeIconBasename($file)) {
                    return '/api/system/storage-icon/' . rawurlencode($file);
                }
            }
        }

        if (str_starts_with($icon, '/storage/icons/')) {
            $file = basename($icon);
            if ($file !== '' && self::isSafeIconBasename($file)) {
                return '/api/system/storage-icon/' . rawurlencode($file);
            }
        }

        return $icon;
    }

    public static function isSafeIconBasename(string $name): bool
    {
        return (bool) preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/', $name);
    }
}
