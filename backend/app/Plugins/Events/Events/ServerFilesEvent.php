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
