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

class NodesEvent implements PluginEvent
{
    // Nodes Management Events
    /**
     * Callback: array nodes list.
     */
    public static function onNodesRetrieved(): string
    {
        return 'featherpanel:admin:nodes:retrieved';
    }

    /**
     * Callback: int node id, array node data.
     */
    public static function onNodeRetrieved(): string
    {
        return 'featherpanel:admin:nodes:node:retrieved';
    }

    /**
     * Callback: array node data.
     */
    public static function onNodeCreated(): string
    {
        return 'featherpanel:admin:nodes:node:created';
    }

    /**
     * Callback: int node id, array old data, array new data.
     */
    public static function onNodeUpdated(): string
    {
        return 'featherpanel:admin:nodes:node:updated';
    }

    /**
     * Callback: int node id, array node data.
     */
    public static function onNodeDeleted(): string
    {
        return 'featherpanel:admin:nodes:node:deleted';
    }

    /**
     * Callback: int node id, string new key.
     */
    public static function onNodeKeyReset(): string
    {
        return 'featherpanel:admin:nodes:node:key:reset';
    }

    // Nodes Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onNodesError(): string
    {
        return 'featherpanel:admin:nodes:error';
    }

    /**
     * Callback: int node id, string error message.
     */
    public static function onNodeNotFound(): string
    {
        return 'featherpanel:admin:nodes:node:not:found';
    }

    /**
     * Callback: int node id, string error message.
     */
    public static function onNodeConnectionError(): string
    {
        return 'featherpanel:admin:nodes:node:connection:error';
    }
}
