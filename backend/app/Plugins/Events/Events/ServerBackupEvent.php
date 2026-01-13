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

class ServerBackupEvent implements PluginEvent
{
    // Server Backup Events
    /**
     * Callback: string server uuid, array backup data.
     */
    public static function onServerBackupCreated(): string
    {
        return 'featherpanel:user:server:backup:created';
    }

    /**
     * Callback: string server uuid, string backup uuid.
     */
    public static function onServerBackupDeleted(): string
    {
        return 'featherpanel:user:server:backup:deleted';
    }

    /**
     * Callback: string server uuid, string backup uuid, string download url.
     */
    public static function onServerBackupDownloaded(): string
    {
        return 'featherpanel:user:server:backup:downloaded';
    }

    /**
     * Callback: string server uuid, string backup uuid.
     */
    public static function onServerBackupRestored(): string
    {
        return 'featherpanel:user:server:backup:restored';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onServerBackupError(): string
    {
        return 'featherpanel:user:server:backup:error';
    }
}
