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

class MailHostsEvent implements PluginEvent
{
    /**
     * Callback: array host data.
     */
    public static function onMailHostCreated(): string
    {
        return 'featherpanel:admin:mail_hosts:host:created';
    }

    /**
     * Callback: int host id, array host data.
     */
    public static function onMailHostUpdated(): string
    {
        return 'featherpanel:admin:mail_hosts:host:updated';
    }

    /**
     * Callback: int host id, array host data.
     */
    public static function onMailHostDeleted(): string
    {
        return 'featherpanel:admin:mail_hosts:host:deleted';
    }
}
