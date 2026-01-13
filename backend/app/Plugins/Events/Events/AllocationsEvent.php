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
