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

class RealmsEvent implements PluginEvent
{
    // Realms Management Events
    /**
     * Callback: array realms list.
     */
    public static function onRealmsRetrieved(): string
    {
        return 'featherpanel:admin:realms:retrieved';
    }

    /**
     * Callback: int realm id, array realm data.
     */
    public static function onRealmRetrieved(): string
    {
        return 'featherpanel:admin:realms:realm:retrieved';
    }

    /**
     * Callback: array realm data.
     */
    public static function onRealmCreated(): string
    {
        return 'featherpanel:admin:realms:realm:created';
    }

    /**
     * Callback: int realm id, array old data, array new data.
     */
    public static function onRealmUpdated(): string
    {
        return 'featherpanel:admin:realms:realm:updated';
    }

    /**
     * Callback: int realm id, array realm data.
     */
    public static function onRealmDeleted(): string
    {
        return 'featherpanel:admin:realms:realm:deleted';
    }

    // Realms Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onRealmsError(): string
    {
        return 'featherpanel:admin:realms:error';
    }

    /**
     * Callback: int realm id, string error message.
     */
    public static function onRealmNotFound(): string
    {
        return 'featherpanel:admin:realms:realm:not:found';
    }
}
