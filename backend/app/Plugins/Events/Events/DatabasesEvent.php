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

class DatabasesEvent implements PluginEvent
{
    // Databases Management Events
    /**
     * Callback: array databases list.
     */
    public static function onDatabasesRetrieved(): string
    {
        return 'featherpanel:admin:databases:retrieved';
    }

    /**
     * Callback: int database id, array database data.
     */
    public static function onDatabaseRetrieved(): string
    {
        return 'featherpanel:admin:databases:database:retrieved';
    }

    /**
     * Callback: array database data.
     */
    public static function onDatabaseCreated(): string
    {
        return 'featherpanel:admin:databases:database:created';
    }

    /**
     * Callback: int database id, array old data, array new data.
     */
    public static function onDatabaseUpdated(): string
    {
        return 'featherpanel:admin:databases:database:updated';
    }

    /**
     * Callback: int database id, array database data.
     */
    public static function onDatabaseDeleted(): string
    {
        return 'featherpanel:admin:databases:database:deleted';
    }

    /**
     * Callback: int node id, array databases.
     */
    public static function onDatabasesByNodeRetrieved(): string
    {
        return 'featherpanel:admin:databases:by:node:retrieved';
    }

    /**
     * Callback: int database id, array health data.
     */
    public static function onDatabaseHealthChecked(): string
    {
        return 'featherpanel:admin:databases:database:health:checked';
    }

    /**
     * Callback: array connection data, array test results.
     */
    public static function onDatabaseConnectionTested(): string
    {
        return 'featherpanel:admin:databases:connection:tested';
    }

    // Databases Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onDatabasesError(): string
    {
        return 'featherpanel:admin:databases:error';
    }

    /**
     * Callback: int database id, string error message.
     */
    public static function onDatabaseNotFound(): string
    {
        return 'featherpanel:admin:databases:database:not:found';
    }

    /**
     * Callback: int database id, string error message.
     */
    public static function onDatabaseConnectionError(): string
    {
        return 'featherpanel:admin:databases:database:connection:error';
    }
}
