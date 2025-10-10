<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
