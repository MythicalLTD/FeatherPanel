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

class WebNodeEvent implements PluginEvent
{
    /**
     * Callback: string|null user uuid, int web node id, array node payload, array context.
     */
    public static function onWebNodeCreated(): string
    {
        return 'featherpanel:web:node:create';
    }

    /**
     * Callback: string|null user uuid, int web node id, array node payload, array changed fields, array context.
     */
    public static function onWebNodeUpdated(): string
    {
        return 'featherpanel:web:node:update';
    }

    /**
     * Callback: string|null user uuid, int web node id, array node payload, array context.
     */
    public static function onWebNodeDeleted(): string
    {
        return 'featherpanel:web:node:delete';
    }

    /**
     * Callback: string|null user uuid, int web node id, array node payload, array context.
     */
    public static function onWebNodeKeyReset(): string
    {
        return 'featherpanel:web:node:key:reset';
    }
}
