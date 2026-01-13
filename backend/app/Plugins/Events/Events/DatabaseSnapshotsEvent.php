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

class DatabaseSnapshotsEvent implements PluginEvent
{
    /**
     * Callback: string filename, int size, string user uuid.
     */
    public static function onSnapshotCreated(): string
    {
        return 'featherpanel:database:snapshot:created';
    }

    /**
     * Callback: string filename, string user uuid.
     */
    public static function onSnapshotRestored(): string
    {
        return 'featherpanel:database:snapshot:restored';
    }

    /**
     * Callback: string filename, string user uuid.
     */
    public static function onSnapshotDeleted(): string
    {
        return 'featherpanel:database:snapshot:deleted';
    }

    /**
     * Callback: string filename, string user uuid.
     */
    public static function onSnapshotDownloaded(): string
    {
        return 'featherpanel:database:snapshot:downloaded';
    }
}
