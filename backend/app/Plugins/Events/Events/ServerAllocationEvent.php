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
