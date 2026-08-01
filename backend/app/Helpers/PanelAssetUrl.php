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
 * Normalizes marketplace / plugin icon URLs.
 *
 * Mythic product icons use absolute CDN hosts (e.g. r2.mythical.systems) and pass through.
 * Legacy api.featherpanel.com icon URLs are EOL and are dropped (return null).
 */
class PanelAssetUrl
{
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

        // api.featherpanel.com is disconnected never rewrite or proxy those URLs.
        if (stripos($icon, 'api.featherpanel.com') !== false) {
            return null;
        }

        return $icon;
    }

    public static function isSafeIconBasename(string $name): bool
    {
        return (bool) preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/', $name);
    }
}
