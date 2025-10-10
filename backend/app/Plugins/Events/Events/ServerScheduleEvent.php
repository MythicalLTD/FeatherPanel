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

class ServerScheduleEvent implements PluginEvent
{
    // Server Schedule Events
    /**
     * Callback: string server uuid, array schedule data.
     */
    public static function onServerScheduleCreated(): string
    {
        return 'featherpanel:user:server:schedule:created';
    }

    /**
     * Callback: string server uuid, int schedule id, array updated data.
     */
    public static function onServerScheduleUpdated(): string
    {
        return 'featherpanel:user:server:schedule:updated';
    }

    /**
     * Callback: string server uuid, int schedule id.
     */
    public static function onServerScheduleDeleted(): string
    {
        return 'featherpanel:user:server:schedule:deleted';
    }

    /**
     * Callback: string server uuid, int schedule id.
     */
    public static function onServerScheduleTriggered(): string
    {
        return 'featherpanel:user:server:schedule:triggered';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onServerScheduleError(): string
    {
        return 'featherpanel:user:server:schedule:error';
    }
}
