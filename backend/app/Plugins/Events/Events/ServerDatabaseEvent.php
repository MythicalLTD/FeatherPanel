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

class ServerDatabaseEvent implements PluginEvent
{
    // Server Database Events
    /**
     * Callback: string server uuid, array database data.
     */
    public static function onServerDatabaseCreated(): string
    {
        return 'featherpanel:user:server:database:created';
    }

    /**
     * Callback: string server uuid, int database id, array updated data.
     */
    public static function onServerDatabaseUpdated(): string
    {
        return 'featherpanel:user:server:database:updated';
    }

    /**
     * Callback: string server uuid, int database id.
     */
    public static function onServerDatabaseDeleted(): string
    {
        return 'featherpanel:user:server:database:deleted';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onServerDatabaseError(): string
    {
        return 'featherpanel:user:server:database:error';
    }
}
