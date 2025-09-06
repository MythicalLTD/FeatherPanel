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
