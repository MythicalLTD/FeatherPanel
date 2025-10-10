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
