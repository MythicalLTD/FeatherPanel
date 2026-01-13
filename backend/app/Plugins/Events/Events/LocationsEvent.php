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
