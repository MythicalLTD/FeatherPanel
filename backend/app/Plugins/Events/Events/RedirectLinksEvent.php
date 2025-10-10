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
