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

class UserEvent implements PluginEvent
{
    /**
     * Callback: string user uuid, string api key id.
     */
    public static function onUserApiKeyCreated(): string
    {
        return 'featherpanel:user:api_client:created';
    }

    /**
     * Callback: string user uuid, string api key id.
     */
    public static function onUserApiKeyUpdated(): string
    {
        return 'featherpanel:user:api_client:updated';
    }

    /**
     * Callback: string user uuid, string api key id.
     */
    public static function onUserApiKeyDeleted(): string
    {
        return 'featherpanel:user:api_client:deleted';
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
        return 'featherpanel:user:ssh_key:created';
    }

    /**
     * Callback: string user uuid, string ssh key id.
     */
    public static function onUserSshKeyUpdated(): string
    {
        return 'featherpanel:user:ssh_key:updated';
    }

    /**
     * Callback: string user uuid, string ssh key id.
     */
    public static function onUserSshKeyDeleted(): string
    {
        return 'featherpanel:user:ssh_key:deleted';
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
