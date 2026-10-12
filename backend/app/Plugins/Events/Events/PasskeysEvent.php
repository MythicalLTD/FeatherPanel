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

class PasskeysEvent implements PluginEvent
{
    /**
     * Callback: array user, array passkey.
     */
    public static function onPasskeyRegistered(): string
    {
        return 'featherpanel:auth:passkey:registered';
    }

    /**
     * Callback: array user, int passkey id.
     */
    public static function onPasskeyDeleted(): string
    {
        return 'featherpanel:auth:passkey:deleted';
    }

    /**
     * Callback: array user, array passkey.
     */
    public static function onPasskeyUpdated(): string
    {
        return 'featherpanel:auth:passkey:updated';
    }

    /**
     * Callback: array user.
     */
    public static function onPasskeyAuthenticationSuccess(): string
    {
        return 'featherpanel:auth:passkey:authentication:success';
    }

    /**
     * Callback: array context.
     */
    public static function onPasskeyAuthenticationFailed(): string
    {
        return 'featherpanel:auth:passkey:authentication:failed';
    }
}
