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

class ServerUserEvent implements PluginEvent
{
    // Server User Events
    /**
     * Callback: string server uuid, array updated data.
     */
    public static function onServerUserUpdated(): string
    {
        return 'featherpanel:user:server:updated';
    }

    /**
     * Callback: string server uuid.
     */
    public static function onServerUserDeleted(): string
    {
        return 'featherpanel:user:server:deleted';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onServerUserError(): string
    {
        return 'featherpanel:user:server:error';
    }
}
