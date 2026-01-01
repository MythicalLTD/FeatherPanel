<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
