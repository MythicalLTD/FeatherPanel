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
