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
