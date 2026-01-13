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
