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

class FileManagerEvent implements PluginEvent
{
    // File Manager Events
    /**
     * Callback: string path, array file data.
     */
    public static function onFileRead(): string
    {
        return 'featherpanel:admin:file_manager:file:read';
    }

    /**
     * Callback: string path, int size.
     */
    public static function onFileSaved(): string
    {
        return 'featherpanel:admin:file_manager:file:saved';
    }

    /**
     * Callback: string path, bool is_directory.
     */
    public static function onFileCreated(): string
    {
        return 'featherpanel:admin:file_manager:file:created';
    }

    /**
     * Callback: string path, bool was_directory.
     */
    public static function onFileDeleted(): string
    {
        return 'featherpanel:admin:file_manager:file:deleted';
    }

    /**
     * Callback: string path, array items.
     */
    public static function onDirectoryBrowsed(): string
    {
        return 'featherpanel:admin:file_manager:directory:browsed';
    }

    // File Manager Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onFileManagerError(): string
    {
        return 'featherpanel:admin:file_manager:error';
    }
}
