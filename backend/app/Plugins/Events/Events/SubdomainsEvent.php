<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
