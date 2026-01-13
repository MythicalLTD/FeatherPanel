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

class UserSshKeyEvent implements PluginEvent
{
    // User SSH Key Events
    /**
     * Callback: array ssh_key data.
     */
    public static function onUserSshKeyCreated(): string
    {
        return 'featherpanel:user:ssh_key:created';
    }

    /**
     * Callback: int ssh_key id, array updated data.
     */
    public static function onUserSshKeyUpdated(): string
    {
        return 'featherpanel:user:ssh_key:updated';
    }

    /**
     * Callback: int ssh_key id, array ssh_key data.
     */
    public static function onUserSshKeyDeleted(): string
    {
        return 'featherpanel:user:ssh_key:deleted';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onUserSshKeyError(): string
    {
        return 'featherpanel:user:ssh_key:error';
    }
}
