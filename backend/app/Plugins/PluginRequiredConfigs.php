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
     * Check if all required configs are set for a plugin.
     *
     * @param string $identifier The plugin identifier
     *
     * @return bool True if all required configs are set
     */
    public static function areRequiredConfigsSet(string $identifier): bool
    {
        try {
            $requiredConfigs = self::getRequiredConfigs($identifier);
            if (empty($requiredConfigs)) {
                return true;
            }

            $settings = PluginSettings::getSettings($identifier);
            $configuredKeys = array_column($settings, 'key');

            foreach ($requiredConfigs as $required) {
                if (!in_array($required, $configuredKeys)) {
                    App::getInstance(true)->getLogger()->warning(
                        "Missing required config '$required' for plugin: $identifier"
                    );

                    return false;
                }
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
