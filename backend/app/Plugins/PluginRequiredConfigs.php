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

use App\App;

class PluginRequiredConfigs
{
    /**
     * Get required configs for a plugin.
     *
     * @param string $identifier The plugin identifier
     *
     * @return array The required configs
     */
    public static function getRequiredConfigs(string $identifier): array
    {
        $config = PluginConfig::getConfig($identifier);

        return $config['plugin']['requiredConfigs'] ?? [];
    }

    /**
     * Get the settings the plugin still needs before it counts as configured.
     *
     * A setting is missing when it has no stored value or only an empty one.
     * Both `plugin.requiredConfigs` and `config:` fields with `required: true` count.
     *
     * @param string $identifier The plugin identifier
     * @param array|null $config The parsed conf.yml (loaded when null)
     *
     * @return list<string> The missing setting keys
     */
    public static function getMissingConfigs(string $identifier, ?array $config = null): array
    {
        $config ??= PluginConfig::getConfig($identifier);
        $requiredConfigs = $config['plugin']['requiredConfigs'] ?? [];
        $schema = $config['config'] ?? [];

        if (PluginSettingsSchema::missingConfigs($requiredConfigs, $schema, []) === []) {
            return [];
        }

        return PluginSettingsSchema::missingConfigs($requiredConfigs, $schema, PluginSettings::getSettingValues($identifier));
    }

    /**
     * Check if all required configs are set for a plugin.
     *
     * A plugin with missing settings is still loaded. The admin plugin list and
     * the plugin settings page show it as "not configured" until the settings are saved.
     *
     * @param string $identifier The plugin identifier
     *
     * @return bool True if all required configs are set
     */
    public static function areRequiredConfigsSet(string $identifier): bool
    {
        try {
            $missing = self::getMissingConfigs($identifier);
            if ($missing !== []) {
                App::getInstance(true)->getLogger()->warning(
                    'Missing required config ' . implode(', ', $missing) . " for plugin: $identifier"
                );

                return false;
            }

            return true;
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error(
                'Error checking required configs: ' . $e->getMessage()
            );

            return false;
        }
    }
}
