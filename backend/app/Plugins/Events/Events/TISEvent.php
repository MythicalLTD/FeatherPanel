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

class TISEvent implements PluginEvent
{
    // TIS Statistics Events
    /**
     * Callback: array stats data.
     */
    public static function onTISStatsRetrieved(): string
    {
        return 'featherpanel:admin:tis:stats:retrieved';
    }

    /**
     * Callback: array hashes data.
     */
    public static function onTISHashesRetrieved(): string
    {
        return 'featherpanel:admin:tis:hashes:retrieved';
    }

    /**
     * Callback: string server uuid, array server status data.
     */
    public static function onTISServerChecked(): string
    {
        return 'featherpanel:admin:tis:server:checked';
    }

    /**
     * Callback: array hashes, array matches data.
     */
    public static function onTISHashesChecked(): string
    {
        return 'featherpanel:admin:tis:hashes:checked';
    }

    // TIS Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onTISError(): string
    {
        return 'featherpanel:admin:tis:error';
    }

    /**
     * Callback: int node id, string error message.
     */
    public static function onTISNodeError(): string
    {
        return 'featherpanel:admin:tis:node:error';
    }
}
