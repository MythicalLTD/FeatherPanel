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
