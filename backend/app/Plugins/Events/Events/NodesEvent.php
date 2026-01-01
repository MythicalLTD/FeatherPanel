<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
