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

class RolesEvent implements PluginEvent
{
    // Roles Management Events
    /**
     * Callback: array roles list.
     */
    public static function onRolesRetrieved(): string
    {
        return 'featherpanel:admin:roles:retrieved';
    }

    /**
     * Callback: int role id, array role data.
     */
    public static function onRoleRetrieved(): string
    {
        return 'featherpanel:admin:roles:role:retrieved';
    }

    /**
     * Callback: array role data.
     */
    public static function onRoleCreated(): string
    {
        return 'featherpanel:admin:roles:role:created';
    }

    /**
     * Callback: int role id, array old data, array new data.
     */
    public static function onRoleUpdated(): string
    {
        return 'featherpanel:admin:roles:role:updated';
    }

    /**
     * Callback: int role id, array role data.
     */
    public static function onRoleDeleted(): string
    {
        return 'featherpanel:admin:roles:role:deleted';
    }

    // Roles Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onRolesError(): string
    {
        return 'featherpanel:admin:roles:error';
    }

    /**
     * Callback: int role id, string error message.
     */
    public static function onRoleNotFound(): string
    {
        return 'featherpanel:admin:roles:role:not:found';
    }
}
