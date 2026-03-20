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

class PluginUiEvent implements PluginEvent
{
    /**
     * Callback: array sidebar sections, array context metadata.
     */
    public static function onSidebarRetrieved(): string
    {
        return 'featherpanel:system:plugins:ui:sidebar:retrieved';
    }

    /**
     * Callback: array widgets by page/location, array context metadata.
     */
    public static function onWidgetsRetrieved(): string
    {
        return 'featherpanel:system:plugins:ui:widgets:retrieved';
    }

    /**
     * Callback: string source, string message, array context metadata.
     */
    public static function onUiError(): string
    {
        return 'featherpanel:system:plugins:ui:error';
    }
}
