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

class RolesEvent implements PluginEvent
{
    // Roles Management Events
    /**
     * Callback: array roles list.
     */
    public static function onRolesRetrieved(): string
    {
        return 'featherpanel:admin:roles:retrieved';
    }

    /**
     * Callback: int role id, array role data.
     */
    public static function onRoleRetrieved(): string
    {
        return 'featherpanel:admin:roles:role:retrieved';
    }

    /**
     * Callback: array role data.
     */
    public static function onRoleCreated(): string
    {
        return 'featherpanel:admin:roles:role:created';
    }

    /**
     * Callback: int role id, array old data, array new data.
     */
    public static function onRoleUpdated(): string
    {
        return 'featherpanel:admin:roles:role:updated';
    }

    /**
     * Callback: int role id, array role data.
     */
    public static function onRoleDeleted(): string
    {
        return 'featherpanel:admin:roles:role:deleted';
    }

    // Roles Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onRolesError(): string
    {
        return 'featherpanel:admin:roles:error';
    }

    /**
     * Callback: int role id, string error message.
     */
    public static function onRoleNotFound(): string
    {
        return 'featherpanel:admin:roles:role:not:found';
    }
}
