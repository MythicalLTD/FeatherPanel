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
