<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
