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

class VdsNodeEvent implements PluginEvent
{
    /**
     * Callback: string|null user uuid, int vm node id, array node payload, array context.
     */
    public static function onVdsNodeCreated(): string
    {
        return 'featherpanel:vds:node:create';
    }

    /**
     * Callback: string|null user uuid, int vm node id, array node payload, array changed fields, array context.
     */
    public static function onVdsNodeUpdated(): string
    {
        return 'featherpanel:vds:node:update';
    }

    /**
     * Callback: string|null user uuid, int vm node id, array node payload, array context.
     */
    public static function onVdsNodeDeleted(): string
    {
        return 'featherpanel:vds:node:delete';
    }

    /**
     * Callback: string|null user uuid, int vm node id, int ip id, array ip payload, array context.
     */
    public static function onVdsNodeIpCreated(): string
    {
        return 'featherpanel:vds:node:ip:create';
    }

    /**
     * Callback: string|null user uuid, int vm node id, int ip id, array ip payload, array changed fields, array context.
     */
    public static function onVdsNodeIpUpdated(): string
    {
        return 'featherpanel:vds:node:ip:update';
    }

    /**
     * Callback: string|null user uuid, int vm node id, int ip id, array ip payload, array context.
     */
    public static function onVdsNodeIpDeleted(): string
    {
        return 'featherpanel:vds:node:ip:delete';
    }

    /**
     * Callback: string|null user uuid, int vm node id, int ip id, array ip payload, array context.
     */
    public static function onVdsNodeIpPrimarySet(): string
    {
        return 'featherpanel:vds:node:ip:primary';
    }

    /**
     * Callback: string|null user uuid, int template id, int vm node id, array template payload, array context.
     */
    public static function onVdsTemplateCreated(): string
    {
        return 'featherpanel:vds:template:create';
    }

    /**
     * Callback: string|null user uuid, int template id, int vm node id, array template payload, array changed fields, array context.
     */
    public static function onVdsTemplateUpdated(): string
    {
        return 'featherpanel:vds:template:update';
    }

    /**
     * Callback: string|null user uuid, int template id, int vm node id, array template payload, array context.
     */
    public static function onVdsTemplateDeleted(): string
    {
        return 'featherpanel:vds:template:delete';
    }
}
