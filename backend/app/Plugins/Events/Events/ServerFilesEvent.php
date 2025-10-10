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

class ServerFilesEvent implements PluginEvent
{
    // Server Files Events
    /**
     * Callback: string server uuid, array files deleted.
     */
    public static function onServerFilesDeleted(): string
    {
        return 'featherpanel:user:server:files:deleted';
    }

    /**
     * Callback: string server uuid, string directory path.
     */
    public static function onServerDirectoryCreated(): string
    {
        return 'featherpanel:user:server:directory:created';
    }

    /**
     * Callback: string server uuid, string file path, int size.
     */
    public static function onServerFileSaved(): string
    {
        return 'featherpanel:user:server:file:saved';
    }

    /**
     * Callback: string server uuid, string file path.
     */
    public static function onServerFileRenamed(): string
    {
        return 'featherpanel:user:server:file:renamed';
    }

    /**
     * Callback: string server uuid, array file data.
     */
    public static function onServerFileUploaded(): string
    {
        return 'featherpanel:user:server:file:uploaded';
    }

    /**
     * Callback: string server uuid, string pull id.
     */
    public static function onServerPullProcessDeleted(): string
    {
        return 'featherpanel:user:server:pull:deleted';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onServerFilesError(): string
    {
        return 'featherpanel:user:server:files:error';
    }
}
