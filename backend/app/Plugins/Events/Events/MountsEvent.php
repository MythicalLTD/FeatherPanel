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

class MountsEvent implements PluginEvent
{
    /**
     * Callback: array mount data.
     */
    public static function onMountCreated(): string
    {
        return 'featherpanel:admin:mounts:mount:created';
    }

    /**
     * Callback: int mount id, array mount data.
     */
    public static function onMountUpdated(): string
    {
        return 'featherpanel:admin:mounts:mount:updated';
    }

    /**
     * Callback: int mount id, array mount data.
     */
    public static function onMountDeleted(): string
    {
        return 'featherpanel:admin:mounts:mount:deleted';
    }
}
