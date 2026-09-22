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

class QuilldEvent implements PluginEvent
{
    /**
     * Callback: array auth context.
     */
    public static function onQuilldSftpAuthenticated(): string
    {
        return 'featherpanel:quilld:sftp:authenticated';
    }

    /**
     * Callback: array webspace.
     */
    public static function onQuilldWebSpaceRetrieved(): string
    {
        return 'featherpanel:quilld:webspace:retrieved';
    }

    /**
     * Callback: array webspace.
     */
    public static function onQuilldWebSpaceUpdated(): string
    {
        return 'featherpanel:quilld:webspace:updated';
    }

    /**
     * Callback: array webspace, array install.
     */
    public static function onQuilldInstallRetrieved(): string
    {
        return 'featherpanel:quilld:install:retrieved';
    }

    /**
     * Callback: array webspace.
     */
    public static function onQuilldInstallCompleted(): string
    {
        return 'featherpanel:quilld:install:completed';
    }

    /**
     * Callback: array transfer.
     */
    public static function onQuilldTransferStatusReported(): string
    {
        return 'featherpanel:quilld:transfer:status';
    }

    /**
     * Callback: array activity.
     */
    public static function onQuilldActivityLogged(): string
    {
        return 'featherpanel:quilld:activity:logged';
    }

    /**
     * Callback: array config.
     */
    public static function onQuilldConfigRetrieved(): string
    {
        return 'featherpanel:quilld:config:retrieved';
    }
}
