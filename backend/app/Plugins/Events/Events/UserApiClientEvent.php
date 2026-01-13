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

class UserApiClientEvent implements PluginEvent
{
    // User API Client Events
    /**
     * Callback: array api_client data.
     */
    public static function onUserApiClientCreated(): string
    {
        return 'featherpanel:user:api_client:created';
    }

    /**
     * Callback: int api_client id, array updated data.
     */
    public static function onUserApiClientUpdated(): string
    {
        return 'featherpanel:user:api_client:updated';
    }

    /**
     * Callback: int api_client id, array api_client data.
     */
    public static function onUserApiClientDeleted(): string
    {
        return 'featherpanel:user:api_client:deleted';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onUserApiClientError(): string
    {
        return 'featherpanel:user:api_client:error';
    }
}
