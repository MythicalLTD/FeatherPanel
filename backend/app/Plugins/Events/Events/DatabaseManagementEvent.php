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

class DatabaseManagementEvent implements PluginEvent
{
    // Database Management Events
    /**
     * Callback: array migration results.
     */
    public static function onMigrationsExecuted(): string
    {
        return 'featherpanel:admin:database_management:migrations:executed';
    }

    /**
     * Callback: array status data.
     */
    public static function onStatusRetrieved(): string
    {
        return 'featherpanel:admin:database_management:status:retrieved';
    }

    // Database Management Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onDatabaseManagementError(): string
    {
        return 'featherpanel:admin:database_management:error';
    }
}
