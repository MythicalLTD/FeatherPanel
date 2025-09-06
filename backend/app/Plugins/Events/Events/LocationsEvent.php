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
