<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Plugins\Events\Events;

use App\Plugins\Events\PluginEvent;

class PluginManagerEvent implements PluginEvent
{
    // Plugin Manager Events
    /**
     * Callback: string identifier, array plugin data.
     */
    public static function onPluginCreated(): string
    {
        return 'featherpanel:admin:plugin_manager:plugin:created';
    }

    /**
     * Callback: string identifier, array updated data.
     */
    public static function onPluginUpdated(): string
    {
        return 'featherpanel:admin:plugin_manager:plugin:updated';
    }

    /**
     * Callback: string identifier, array settings data.
     */
    public static function onPluginSettingsUpdated(): string
    {
        return 'featherpanel:admin:plugin_manager:settings:updated';
    }

    /**
     * Callback: string identifier, string file type, array file data.
     */
    public static function onPluginFileCreated(): string
    {
        return 'featherpanel:admin:plugin_manager:file:created';
    }

    // Plugin Manager Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onPluginManagerError(): string
    {
        return 'featherpanel:admin:plugin_manager:error';
    }
}
