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

class ServerAllocationEvent implements PluginEvent
{
    // Server Allocation Events
    /**
     * Callback: string server uuid, int allocation id.
     */
    public static function onServerAllocationDeleted(): string
    {
        return 'featherpanel:user:server:allocation:deleted';
    }

    /**
     * Callback: string server uuid, int allocation id, bool is_primary.
     */
    public static function onServerAllocationSetPrimary(): string
    {
        return 'featherpanel:user:server:allocation:set_primary';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onServerAllocationError(): string
    {
        return 'featherpanel:user:server:allocation:error';
    }
}
