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
