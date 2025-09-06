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

class RealmsEvent implements PluginEvent
{
    // Realms Management Events
    /**
     * Callback: array realms list.
     */
    public static function onRealmsRetrieved(): string
    {
        return 'featherpanel:admin:realms:retrieved';
    }

    /**
     * Callback: int realm id, array realm data.
     */
    public static function onRealmRetrieved(): string
    {
        return 'featherpanel:admin:realms:realm:retrieved';
    }

    /**
     * Callback: array realm data.
     */
    public static function onRealmCreated(): string
    {
        return 'featherpanel:admin:realms:realm:created';
    }

    /**
     * Callback: int realm id, array old data, array new data.
     */
    public static function onRealmUpdated(): string
    {
        return 'featherpanel:admin:realms:realm:updated';
    }

    /**
     * Callback: int realm id, array realm data.
     */
    public static function onRealmDeleted(): string
    {
        return 'featherpanel:admin:realms:realm:deleted';
    }

    // Realms Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onRealmsError(): string
    {
        return 'featherpanel:admin:realms:error';
    }

    /**
     * Callback: int realm id, string error message.
     */
    public static function onRealmNotFound(): string
    {
        return 'featherpanel:admin:realms:realm:not:found';
    }
}
