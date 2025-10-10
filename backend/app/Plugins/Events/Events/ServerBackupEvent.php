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
