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

interface AppPlugin
{
    /**
     * Process the events for the plugin.
     *
     * @param PluginEvents $event The event to process
     */
    public static function processEvents(PluginEvents $event): void;

    /**
     * Process the plugin install.
     * Called when the plugin is first installed.
     */
    public static function pluginInstall(): void;

    /**
     * Process the plugin uninstall.
     * Called when the plugin is being uninstalled.
     */
    public static function pluginUninstall(): void;

    /**
     * Optional: Process the plugin update.
     * Called when the plugin is updated to a new version.
     * This method is OPTIONAL and not part of the interface to maintain backward compatibility.
     * Plugins can optionally implement this method to handle update-specific logic.
     *
     * @param string|null $oldVersion The previous version of the plugin (e.g., "1.0.0")
     * @param string|null $newVersion The new version being installed (e.g., "1.0.1")
     *
     * @example
     * public static function pluginUpdate(?string $oldVersion, ?string $newVersion): void
     * {
     *     // Handle update logic here
     *     // Migrate data, update configurations, etc.
     * }
     */
    // public static function pluginUpdate(?string $oldVersion, ?string $newVersion): void;
}
