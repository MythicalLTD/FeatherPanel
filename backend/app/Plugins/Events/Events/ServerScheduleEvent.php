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
