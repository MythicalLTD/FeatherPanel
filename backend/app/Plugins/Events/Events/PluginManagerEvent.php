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
