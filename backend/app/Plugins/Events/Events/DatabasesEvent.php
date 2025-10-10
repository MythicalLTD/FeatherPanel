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

class DatabasesEvent implements PluginEvent
{
    // Databases Management Events
    /**
     * Callback: array databases list.
     */
    public static function onDatabasesRetrieved(): string
    {
        return 'featherpanel:admin:databases:retrieved';
    }

    /**
     * Callback: int database id, array database data.
     */
    public static function onDatabaseRetrieved(): string
    {
        return 'featherpanel:admin:databases:database:retrieved';
    }

    /**
     * Callback: array database data.
     */
    public static function onDatabaseCreated(): string
    {
        return 'featherpanel:admin:databases:database:created';
    }

    /**
     * Callback: int database id, array old data, array new data.
     */
    public static function onDatabaseUpdated(): string
    {
        return 'featherpanel:admin:databases:database:updated';
    }

    /**
     * Callback: int database id, array database data.
     */
    public static function onDatabaseDeleted(): string
    {
        return 'featherpanel:admin:databases:database:deleted';
    }

    /**
     * Callback: int node id, array databases.
     */
    public static function onDatabasesByNodeRetrieved(): string
    {
        return 'featherpanel:admin:databases:by:node:retrieved';
    }

    /**
     * Callback: int database id, array health data.
     */
    public static function onDatabaseHealthChecked(): string
    {
        return 'featherpanel:admin:databases:database:health:checked';
    }

    /**
     * Callback: array connection data, array test results.
     */
    public static function onDatabaseConnectionTested(): string
    {
        return 'featherpanel:admin:databases:connection:tested';
    }

    // Databases Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onDatabasesError(): string
    {
        return 'featherpanel:admin:databases:error';
    }

    /**
     * Callback: int database id, string error message.
     */
    public static function onDatabaseNotFound(): string
    {
        return 'featherpanel:admin:databases:database:not:found';
    }

    /**
     * Callback: int database id, string error message.
     */
    public static function onDatabaseConnectionError(): string
    {
        return 'featherpanel:admin:databases:database:connection:error';
    }
}
