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
 * Shared visibility rules for plugin frontend manifests.
 *
 * Supported shape:
 * - enabled: true|false
 * - hidden: true|false
 * - enabled/hidden: { "type": "always|never|plugin_setting", "key": "...", "equals": "true" }
 */
class PluginFrontendVisibility
{
    public static function isVisible(string $plugin, array $item, ?string $scope = null, ?string $id = null): bool
    {
        if ($scope !== null && $id !== null) {
            $override = PluginSettings::getSetting($plugin, self::hiddenSettingKey($scope, $id));
            if ($override === 'true') {
                return false;
            }
        }

        if (array_key_exists('enabled', $item) && !self::evaluate($plugin, $item['enabled'], true)) {
            return false;
        }

        if (array_key_exists('hidden', $item) && self::evaluate($plugin, $item['hidden'], false)) {
            return false;
        }

        return true;
    }

    public static function hiddenSettingKey(string $scope, string $id): string
    {
        $scope = preg_replace('/[^a-z0-9_\-]/i', '-', $scope) ?: 'item';

        return 'plugin-visibility-hidden-' . strtolower($scope) . '-' . sha1($id);
    }

    public static function evaluate(string $plugin, mixed $config, bool $default = true): bool
    {
        if ($config === true || $config === 'true' || $config === 1 || $config === '1') {
            return true;
        }

        if ($config === false || $config === 'false' || $config === 0 || $config === '0') {
            return false;
        }

        if (!is_array($config)) {
            return $default;
        }

        $type = (string) ($config['type'] ?? 'always');

        if ($type === 'always') {
            return true;
        }

        if ($type === 'never') {
            return false;
        }

        if ($type === 'plugin_setting') {
            $key = trim((string) ($config['key'] ?? ''));
            if ($key === '') {
                return false;
            }

            $expected = (string) ($config['equals'] ?? 'true');
            $actual = PluginSettings::getSetting($plugin, $key);

            if ($actual === null || $actual === '') {
                return false;
            }

            return (string) $actual === $expected;
        }

        return false;
    }
}
