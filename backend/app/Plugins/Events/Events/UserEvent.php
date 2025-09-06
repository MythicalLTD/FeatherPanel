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

class UserEvent implements PluginEvent
{
    /**
     * Callback: string user uuid, string api key id.
     */
    public static function onUserApiKeyCreated(): string
    {
        return 'featherpanel:user:api:create';
    }

    /**
     * Callback: string user uuid, string api key id.
     */
    public static function onUserApiKeyUpdated(): string
    {
        return 'featherpanel:user:api:update';
    }

    /**
     * Callback: string user uuid, string api key id.
     */
    public static function onUserApiKeyDeleted(): string
    {
        return 'featherpanel:user:api:delete';
    }

    /**
     * Callback: string user uuid.
     */
    public static function onUserUpdate(): string
    {
        return 'featherpanel:user:update';
    }

    /**
     * Callback: string user uuid, string ssh key id.
     */
    public static function onUserSshKeyCreated(): string
    {
        return 'featherpanel:user:ssh:create';
    }

    /**
     * Callback: string user uuid, string ssh key id.
     */
    public static function onUserSshKeyUpdated(): string
    {
        return 'featherpanel:user:ssh:update';
    }

    /**
     * Callback: string user uuid, string ssh key id.
     */
    public static function onUserSshKeyDeleted(): string
    {
        return 'featherpanel:user:ssh:delete';
    }

    /**
     * Callback: array user data, int user id, array created by.
     */
    public static function onUserCreated(): string
    {
        return 'featherpanel:user:created';
    }

    /**
     * Callback: array user data, array updated data, array updated by.
     */
    public static function onUserUpdated(): string
    {
        return 'featherpanel:user:updated';
    }

    /**
     * Callback: array user data, array deleted by.
     */
    public static function onUserDeleted(): string
    {
        return 'featherpanel:user:deleted';
    }
}
