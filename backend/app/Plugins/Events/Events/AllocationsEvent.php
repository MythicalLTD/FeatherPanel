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

class AllocationsEvent implements PluginEvent
{
    // Allocations Management Events
    /**
     * Callback: array allocations list.
     */
    public static function onAllocationsRetrieved(): string
    {
        return 'featherpanel:admin:allocations:retrieved';
    }

    /**
     * Callback: int allocation id, array allocation data.
     */
    public static function onAllocationRetrieved(): string
    {
        return 'featherpanel:admin:allocations:allocation:retrieved';
    }

    /**
     * Callback: array allocation data.
     */
    public static function onAllocationCreated(): string
    {
        return 'featherpanel:admin:allocations:allocation:created';
    }

    /**
     * Callback: int allocation id, array old data, array new data.
     */
    public static function onAllocationUpdated(): string
    {
        return 'featherpanel:admin:allocations:allocation:updated';
    }

    /**
     * Callback: int allocation id, array allocation data.
     */
    public static function onAllocationDeleted(): string
    {
        return 'featherpanel:admin:allocations:allocation:deleted';
    }

    // Allocations Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onAllocationsError(): string
    {
        return 'featherpanel:admin:allocations:error';
    }

    /**
     * Callback: int allocation id, string error message.
     */
    public static function onAllocationNotFound(): string
    {
        return 'featherpanel:admin:allocations:allocation:not:found';
    }
}
