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
