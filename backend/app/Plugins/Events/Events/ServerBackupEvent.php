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

class ServerBackupEvent implements PluginEvent
{
    // Server Backup Events
    /**
     * Callback: string server uuid, array backup data.
     */
    public static function onServerBackupCreated(): string
    {
        return 'featherpanel:user:server:backup:created';
    }

    /**
     * Callback: string server uuid, string backup uuid.
     */
    public static function onServerBackupDeleted(): string
    {
        return 'featherpanel:user:server:backup:deleted';
    }

    /**
     * Callback: string server uuid, string backup uuid, string download url.
     */
    public static function onServerBackupDownloaded(): string
    {
        return 'featherpanel:user:server:backup:downloaded';
    }

    /**
     * Callback: string server uuid, string backup uuid.
     */
    public static function onServerBackupRestored(): string
    {
        return 'featherpanel:user:server:backup:restored';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onServerBackupError(): string
    {
        return 'featherpanel:user:server:backup:error';
    }
}
