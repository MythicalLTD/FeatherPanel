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

class RedirectLinksEvent implements PluginEvent
{
    // Redirect Links Management Events
    /**
     * Callback: array links list.
     */
    public static function onRedirectLinksRetrieved(): string
    {
        return 'featherpanel:admin:redirect_links:retrieved';
    }

    /**
     * Callback: int link id, array link data.
     */
    public static function onRedirectLinkRetrieved(): string
    {
        return 'featherpanel:admin:redirect_links:link:retrieved';
    }

    /**
     * Callback: array link data.
     */
    public static function onRedirectLinkCreated(): string
    {
        return 'featherpanel:admin:redirect_links:link:created';
    }

    /**
     * Callback: int link id, array old data, array new data.
     */
    public static function onRedirectLinkUpdated(): string
    {
        return 'featherpanel:admin:redirect_links:link:updated';
    }

    /**
     * Callback: int link id, array link data.
     */
    public static function onRedirectLinkDeleted(): string
    {
        return 'featherpanel:admin:redirect_links:link:deleted';
    }

    // Redirect Links Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onRedirectLinksError(): string
    {
        return 'featherpanel:admin:redirect_links:error';
    }

    /**
     * Callback: int link id, string error message.
     */
    public static function onRedirectLinkNotFound(): string
    {
        return 'featherpanel:admin:redirect_links:link:not:found';
    }
}
