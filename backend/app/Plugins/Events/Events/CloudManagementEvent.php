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

class CloudManagementEvent implements PluginEvent
{
    // Cloud Management Credentials Events
    /**
     * Callback: array credentials data.
     */
    public static function onCloudCredentialsRetrieved(): string
    {
        return 'featherpanel:admin:cloud:credentials:retrieved';
    }

    /**
     * Callback: array credentials data.
     */
    public static function onPanelCredentialsStored(): string
    {
        return 'featherpanel:admin:cloud:panel:credentials:stored';
    }

    /**
     * Callback: array credentials data.
     */
    public static function onCloudCredentialsStored(): string
    {
        return 'featherpanel:admin:cloud:cloud:credentials:stored';
    }

    /**
     * Callback: string credential type.
     */
    public static function onCloudCredentialsRotated(): string
    {
        return 'featherpanel:admin:cloud:credentials:rotated';
    }

    // Cloud Management Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onCloudManagementError(): string
    {
        return 'featherpanel:admin:cloud:error';
    }
}
