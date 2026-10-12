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

namespace App\Plugins;

/**
 * Shared helpers for scanning plugin Frontend/*.json manifests.
 */
class PluginFrontendScanner
{
    /**
     * @return list<string>
     */
    public static function listPluginIdentifiers(): array
    {
        $pluginDir = self::getAddonsDir();
        if ($pluginDir === '' || !is_dir($pluginDir)) {
            return [];
        }

        $entries = array_diff(scandir($pluginDir) ?: [], ['.', '..']);
        $out = [];
        foreach ($entries as $entry) {
            if (!is_string($entry) || $entry === '') {
                continue;
            }
            if (!is_dir($pluginDir . '/' . $entry)) {
                continue;
            }
            $out[] = $entry;
        }

        return $out;
    }

    public static function getAddonsDir(): string
    {
        $fromHelper = PluginHelper::getPluginsDir();
        if ($fromHelper !== '') {
            return $fromHelper;
        }

        $fallback = __DIR__ . '/../../storage/addons';

        return is_dir($fallback) ? $fallback : '';
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function readJsonFile(string $plugin, string $relativePath): ?array
    {
        $path = self::getAddonsDir() . '/' . $plugin . '/' . ltrim($relativePath, '/');
        if (!is_file($path) || !is_readable($path)) {
            return null;
        }

        $raw = file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }

        try {
            $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        return is_array($decoded) ? $decoded : null;
    }

    public static function pluginDisplayName(string $plugin): string
    {
        $config = PluginHelper::getPluginConfig($plugin);
        $name = $config['plugin']['name'] ?? null;

        return is_string($name) && $name !== '' ? $name : $plugin;
    }

    /**
     * Resolve a Frontend-relative asset to a public URL under /components/{plugin}/.
     */
    public static function componentPublicUrl(string $plugin, string $relative): string
    {
        $relative = ltrim(str_replace('\\', '/', $relative), '/');

        return '/components/' . rawurlencode($plugin) . '/' . $relative;
    }
}
