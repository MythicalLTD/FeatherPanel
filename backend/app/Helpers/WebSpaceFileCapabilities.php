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
 * Default WebSpace file manager capabilities (fallback when daemon is unreachable).
 */
final class WebSpaceFileCapabilities
{
    /** @var array<string, bool> */
    public const DEFAULTS = [
        'trash' => true,
        'share' => true,
        'wipe_all' => true,
        'directory_download' => true,
        'archive_browse' => true,
        'archive_extract_selection' => true,
        'advanced_search' => true,
        'abort_install' => true,
        'pull_progress' => true,
        'signed_upload_url' => true,
        'paginated_list' => true,
        'compress_7z' => true,
    ];

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array<string, bool>
     */
    public static function resolve(array $webNode, string $uuid): array
    {
        $caps = self::DEFAULTS;
        $daemon = FeatherQuilldClient::getWebSpaceFileCapabilities($webNode, $uuid);
        if ($daemon['ok'] && is_array($daemon['body'])) {
            $body = $daemon['body'];
            $data = is_array($body['data'] ?? null) ? $body['data'] : $body;
            foreach ($data as $key => $value) {
                if (is_string($key)) {
                    $caps[$key] = (bool) $value;
                }
            }
        }

        return $caps;
    }

    /**
     * @param array<string, bool> $caps
     */
    public static function supports(array $caps, string $feature): bool
    {
        return ($caps[$feature] ?? self::DEFAULTS[$feature] ?? false) === true;
    }
}
