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

class SubdomainsEvent implements PluginEvent
{
    // Subdomain Domains Management Events
    /**
     * Callback: array domains list.
     */
    public static function onSubdomainDomainsRetrieved(): string
    {
        return 'featherpanel:admin:subdomains:domains:retrieved';
    }

    /**
     * Callback: string domain uuid, array domain data.
     */
    public static function onSubdomainDomainRetrieved(): string
    {
        return 'featherpanel:admin:subdomains:domain:retrieved';
    }

    /**
     * Callback: array domain data.
     */
    public static function onSubdomainDomainCreated(): string
    {
        return 'featherpanel:admin:subdomains:domain:created';
    }

    /**
     * Callback: string domain uuid, array old data, array new data.
     */
    public static function onSubdomainDomainUpdated(): string
    {
        return 'featherpanel:admin:subdomains:domain:updated';
    }

    /**
     * Callback: string domain uuid, array domain data.
     */
    public static function onSubdomainDomainDeleted(): string
    {
        return 'featherpanel:admin:subdomains:domain:deleted';
    }

    /**
     * Callback: array settings data.
     */
    public static function onSubdomainSettingsUpdated(): string
    {
        return 'featherpanel:admin:subdomains:settings:updated';
    }

    // Subdomain Entries Management Events (User)
    /**
     * Callback: string subdomain uuid, array subdomain data, array server data.
     */
    public static function onSubdomainCreated(): string
    {
        return 'featherpanel:user:subdomain:created';
    }

    /**
     * Callback: string subdomain uuid, array subdomain data, array server data.
     */
    public static function onSubdomainDeleted(): string
    {
        return 'featherpanel:user:subdomain:deleted';
    }

    // Subdomains Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onSubdomainsError(): string
    {
        return 'featherpanel:admin:subdomains:error';
    }

    /**
     * Callback: string domain uuid, string error message.
     */
    public static function onSubdomainDomainNotFound(): string
    {
        return 'featherpanel:admin:subdomains:domain:not:found';
    }
}
