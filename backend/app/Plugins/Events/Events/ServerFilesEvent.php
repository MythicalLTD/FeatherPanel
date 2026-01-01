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

class ServerFilesEvent implements PluginEvent
{
    // Server Files Events
    /**
     * Callback: string server uuid, array files deleted.
     */
    public static function onServerFilesDeleted(): string
    {
        return 'featherpanel:user:server:files:deleted';
    }

    /**
     * Callback: string server uuid, string directory path.
     */
    public static function onServerDirectoryCreated(): string
    {
        return 'featherpanel:user:server:directory:created';
    }

    /**
     * Callback: string server uuid, string file path, int size.
     */
    public static function onServerFileSaved(): string
    {
        return 'featherpanel:user:server:file:saved';
    }

    /**
     * Callback: string server uuid, string file path.
     */
    public static function onServerFileRenamed(): string
    {
        return 'featherpanel:user:server:file:renamed';
    }

    /**
     * Callback: string server uuid, array file data.
     */
    public static function onServerFileUploaded(): string
    {
        return 'featherpanel:user:server:file:uploaded';
    }

    /**
     * Callback: string server uuid, string pull id.
     */
    public static function onServerPullProcessDeleted(): string
    {
        return 'featherpanel:user:server:pull:deleted';
    }

    // Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onServerFilesError(): string
    {
        return 'featherpanel:user:server:files:error';
    }
}
