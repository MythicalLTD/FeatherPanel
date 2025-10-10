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
