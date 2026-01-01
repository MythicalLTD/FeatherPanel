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

class ServerTaskEvent implements PluginEvent
{
    // Server Task Events
    /**
     * Callback: string server uuid, int schedule id, array task data.
     */
    public static function onServerTaskCreated(): string
    {
        return 'featherpanel:user:server:task:created';
    }

    /**
     * Callback: string server uuid, int schedule id, int task id, array updated data.
     */
    public static function onServerTaskUpdated(): string
    {
        return 'featherpanel:user:server:task:updated';
    }

    /**
     * Callback: string server uuid, int schedule id, int task id.
     */
    public static function onServerTaskDeleted(): string
    {
        return 'featherpanel:user:server:task:deleted';
    }

    /**
     * Callback: string server uuid, int schedule id, int task id, array new sequence.
     */
    public static function onServerTaskSequenceUpdated(): string
    {
        return 'featherpanel:user:server:task:sequence:updated';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onServerTaskError(): string
    {
        return 'featherpanel:user:server:task:error';
    }
}
