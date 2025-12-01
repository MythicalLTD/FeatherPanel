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

class ServerScheduleEvent implements PluginEvent
{
    // Server Schedule Events
    /**
     * Callback: string server uuid, array schedule data.
     */
    public static function onServerScheduleCreated(): string
    {
        return 'featherpanel:user:server:schedule:created';
    }

    /**
     * Callback: string server uuid, int schedule id, array updated data.
     */
    public static function onServerScheduleUpdated(): string
    {
        return 'featherpanel:user:server:schedule:updated';
    }

    /**
     * Callback: string server uuid, int schedule id.
     */
    public static function onServerScheduleDeleted(): string
    {
        return 'featherpanel:user:server:schedule:deleted';
    }

    /**
     * Callback: string server uuid, int schedule id.
     */
    public static function onServerScheduleTriggered(): string
    {
        return 'featherpanel:user:server:schedule:triggered';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onServerScheduleError(): string
    {
        return 'featherpanel:user:server:schedule:error';
    }
}
