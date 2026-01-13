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

class CloudPluginsEvent implements PluginEvent
{
    /**
     * Callback: string identifier, array plugin data, string user uuid.
     */
    public static function onPluginInstalled(): string
    {
        return 'featherpanel:cloud:plugin:installed';
    }

    /**
     * Callback: string identifier, string user uuid.
     */
    public static function onPluginUninstalled(): string
    {
        return 'featherpanel:cloud:plugin:uninstalled';
    }
}
