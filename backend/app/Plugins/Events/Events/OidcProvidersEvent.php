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

class OidcProvidersEvent implements PluginEvent
{
    /**
     * Callback: string|null user uuid, array provider.
     */
    public static function onOidcProviderCreated(): string
    {
        return 'featherpanel:oidc:provider:create';
    }

    /**
     * Callback: string|null user uuid, array provider, array changed fields.
     */
    public static function onOidcProviderUpdated(): string
    {
        return 'featherpanel:oidc:provider:update';
    }

    /**
     * Callback: string|null user uuid, array provider.
     */
    public static function onOidcProviderDeleted(): string
    {
        return 'featherpanel:oidc:provider:delete';
    }
}
