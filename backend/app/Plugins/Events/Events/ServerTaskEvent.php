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

class ServerTaskEvent implements PluginEvent
{
    // Server Task Events
    /**
     * Callback: string server uuid, int schedule id, array task data.
     */
    public static function onServerTaskCreated(): string
    {
        return 'featherpanel:user:server:task:created';
    }

    /**
     * Callback: string server uuid, int schedule id, int task id, array updated data.
     */
    public static function onServerTaskUpdated(): string
    {
        return 'featherpanel:user:server:task:updated';
    }

    /**
     * Callback: string server uuid, int schedule id, int task id.
     */
    public static function onServerTaskDeleted(): string
    {
        return 'featherpanel:user:server:task:deleted';
    }

    /**
     * Callback: string server uuid, int schedule id, int task id, array new sequence.
     */
    public static function onServerTaskSequenceUpdated(): string
    {
        return 'featherpanel:user:server:task:sequence:updated';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onServerTaskError(): string
    {
        return 'featherpanel:user:server:task:error';
    }
}
