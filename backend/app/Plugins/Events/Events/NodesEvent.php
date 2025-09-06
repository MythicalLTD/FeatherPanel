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
