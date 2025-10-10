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

class LocationsEvent implements PluginEvent
{
    // Locations Management Events
    /**
     * Callback: array locations list.
     */
    public static function onLocationsRetrieved(): string
    {
        return 'featherpanel:admin:locations:retrieved';
    }

    /**
     * Callback: int location id, array location data.
     */
    public static function onLocationRetrieved(): string
    {
        return 'featherpanel:admin:locations:location:retrieved';
    }

    /**
     * Callback: array location data.
     */
    public static function onLocationCreated(): string
    {
        return 'featherpanel:admin:locations:location:created';
    }

    /**
     * Callback: int location id, array old data, array new data.
     */
    public static function onLocationUpdated(): string
    {
        return 'featherpanel:admin:locations:location:updated';
    }

    /**
     * Callback: int location id, array location data.
     */
    public static function onLocationDeleted(): string
    {
        return 'featherpanel:admin:locations:location:deleted';
    }

    // Locations Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onLocationsError(): string
    {
        return 'featherpanel:admin:locations:error';
    }

    /**
     * Callback: int location id, string error message.
     */
    public static function onLocationNotFound(): string
    {
        return 'featherpanel:admin:locations:location:not:found';
    }
}
