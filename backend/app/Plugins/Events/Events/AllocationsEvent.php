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
