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
