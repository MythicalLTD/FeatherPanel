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
