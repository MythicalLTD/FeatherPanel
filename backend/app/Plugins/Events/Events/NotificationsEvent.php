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

class NotificationsEvent implements PluginEvent
{
    // Notifications Management Events
    /**
     * Callback: array notifications list.
     */
    public static function onNotificationsRetrieved(): string
    {
        return 'featherpanel:admin:notifications:retrieved';
    }

    /**
     * Callback: int notification id, array notification data.
     */
    public static function onNotificationRetrieved(): string
    {
        return 'featherpanel:admin:notifications:notification:retrieved';
    }

    /**
     * Callback: array notification data.
     */
    public static function onNotificationCreated(): string
    {
        return 'featherpanel:admin:notifications:notification:created';
    }

    /**
     * Callback: int notification id, array old data, array new data.
     */
    public static function onNotificationUpdated(): string
    {
        return 'featherpanel:admin:notifications:notification:updated';
    }

    /**
     * Callback: int notification id, array notification data.
     */
    public static function onNotificationDeleted(): string
    {
        return 'featherpanel:admin:notifications:notification:deleted';
    }

    /**
     * Callback: int notification id, int user id.
     */
    public static function onNotificationDismissed(): string
    {
        return 'featherpanel:user:notifications:notification:dismissed';
    }

    // Notifications Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onNotificationsError(): string
    {
        return 'featherpanel:admin:notifications:error';
    }

    /**
     * Callback: int notification id, string error message.
     */
    public static function onNotificationNotFound(): string
    {
        return 'featherpanel:admin:notifications:notification:not:found';
    }
}
