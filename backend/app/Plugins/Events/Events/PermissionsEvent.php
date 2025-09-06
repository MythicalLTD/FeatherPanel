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

class PermissionsEvent implements PluginEvent
{
    // Permissions Management Events
    /**
     * Callback: array permissions list.
     */
    public static function onPermissionsRetrieved(): string
    {
        return 'featherpanel:admin:permissions:retrieved';
    }

    /**
     * Callback: int permission id, array permission data.
     */
    public static function onPermissionRetrieved(): string
    {
        return 'featherpanel:admin:permissions:permission:retrieved';
    }

    /**
     * Callback: array permission data.
     */
    public static function onPermissionCreated(): string
    {
        return 'featherpanel:admin:permissions:permission:created';
    }

    /**
     * Callback: int permission id, array old data, array new data.
     */
    public static function onPermissionUpdated(): string
    {
        return 'featherpanel:admin:permissions:permission:updated';
    }

    /**
     * Callback: int permission id, array permission data.
     */
    public static function onPermissionDeleted(): string
    {
        return 'featherpanel:admin:permissions:permission:deleted';
    }

    // Permissions Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onPermissionsError(): string
    {
        return 'featherpanel:admin:permissions:error';
    }

    /**
     * Callback: int permission id, string error message.
     */
    public static function onPermissionNotFound(): string
    {
        return 'featherpanel:admin:permissions:permission:not:found';
    }
}
