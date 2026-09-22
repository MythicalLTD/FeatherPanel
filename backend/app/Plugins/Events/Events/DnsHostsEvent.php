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

class DnsHostsEvent implements PluginEvent
{
    /**
     * Callback: array host data.
     */
    public static function onDnsHostCreated(): string
    {
        return 'featherpanel:admin:dns_hosts:host:created';
    }

    /**
     * Callback: int host id, array host data.
     */
    public static function onDnsHostUpdated(): string
    {
        return 'featherpanel:admin:dns_hosts:host:updated';
    }

    /**
     * Callback: int host id, array host data.
     */
    public static function onDnsHostDeleted(): string
    {
        return 'featherpanel:admin:dns_hosts:host:deleted';
    }
}
