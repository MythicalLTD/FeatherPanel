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

class SettingsEvent implements PluginEvent
{
    // Settings Management Events
    /**
     * Callback: array settings data.
     */
    public static function onSettingsRetrieved(): string
    {
        return 'featherpanel:admin:settings:retrieved';
    }

    /**
     * Callback: string category, array settings.
     */
    public static function onSettingsByCategoryRetrieved(): string
    {
        return 'featherpanel:admin:settings:category:retrieved';
    }

    /**
     * Callback: string setting name, array setting data.
     */
    public static function onSettingRetrieved(): string
    {
        return 'featherpanel:admin:settings:setting:retrieved';
    }

    /**
     * Callback: array updated settings, array old values.
     */
    public static function onSettingsUpdated(): string
    {
        return 'featherpanel:admin:settings:updated';
    }

    /**
     * Callback: string setting name, mixed old value, mixed new value.
     */
    public static function onSettingUpdated(): string
    {
        return 'featherpanel:admin:settings:setting:updated';
    }

    // Settings Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onSettingsError(): string
    {
        return 'featherpanel:admin:settings:error';
    }

    /**
     * Callback: string setting name, string error message.
     */
    public static function onSettingValidationError(): string
    {
        return 'featherpanel:admin:settings:validation:error';
    }
}
