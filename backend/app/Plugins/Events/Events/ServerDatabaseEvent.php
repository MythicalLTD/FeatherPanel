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
