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

class ServerSubuserEvent implements PluginEvent
{
    // Server Subuser Events
    /**
     * Callback: string server uuid, array subuser data.
     */
    public static function onServerSubuserCreated(): string
    {
        return 'featherpanel:user:server:subuser:created';
    }

    /**
     * Callback: string server uuid, int subuser id, array updated data.
     */
    public static function onServerSubuserUpdated(): string
    {
        return 'featherpanel:user:server:subuser:updated';
    }

    /**
     * Callback: string server uuid, int subuser id.
     */
    public static function onServerSubuserDeleted(): string
    {
        return 'featherpanel:user:server:subuser:deleted';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onServerSubuserError(): string
    {
        return 'featherpanel:user:server:subuser:error';
    }
}
