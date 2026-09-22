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

class HostingPackagesEvent implements PluginEvent
{
    /**
     * Callback: array package data.
     */
    public static function onHostingPackageCreated(): string
    {
        return 'featherpanel:admin:hosting_packages:package:created';
    }

    /**
     * Callback: int package id, array package data.
     */
    public static function onHostingPackageUpdated(): string
    {
        return 'featherpanel:admin:hosting_packages:package:updated';
    }

    /**
     * Callback: int package id, array package data.
     */
    public static function onHostingPackageDeleted(): string
    {
        return 'featherpanel:admin:hosting_packages:package:deleted';
    }
}
