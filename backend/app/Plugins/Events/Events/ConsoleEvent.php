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

class ConsoleEvent implements PluginEvent
{
    // Console Events
    /**
     * Callback: string command, array execution data.
     */
    public static function onCommandExecuted(): string
    {
        return 'featherpanel:admin:console:command:executed';
    }

    /**
     * Callback: array system info.
     */
    public static function onSystemInfoRetrieved(): string
    {
        return 'featherpanel:admin:console:system_info:retrieved';
    }

    // Console Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onConsoleError(): string
    {
        return 'featherpanel:admin:console:error';
    }
}
