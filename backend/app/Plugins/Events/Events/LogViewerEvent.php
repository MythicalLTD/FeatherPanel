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

class LogViewerEvent implements PluginEvent
{
    // Log Viewer Events
    /**
     * Callback: string log type, string file name.
     */
    public static function onLogViewed(): string
    {
        return 'featherpanel:admin:log_viewer:viewed';
    }

    /**
     * Callback: string log type, string file name.
     */
    public static function onLogCleared(): string
    {
        return 'featherpanel:admin:log_viewer:cleared';
    }

    /**
     * Callback: array upload results.
     */
    public static function onLogsUploaded(): string
    {
        return 'featherpanel:admin:log_viewer:uploaded';
    }

    // Log Viewer Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onLogViewerError(): string
    {
        return 'featherpanel:admin:log_viewer:error';
    }
}
