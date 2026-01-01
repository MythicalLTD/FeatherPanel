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

class FileManagerEvent implements PluginEvent
{
    // File Manager Events
    /**
     * Callback: string path, array file data.
     */
    public static function onFileRead(): string
    {
        return 'featherpanel:admin:file_manager:file:read';
    }

    /**
     * Callback: string path, int size.
     */
    public static function onFileSaved(): string
    {
        return 'featherpanel:admin:file_manager:file:saved';
    }

    /**
     * Callback: string path, bool is_directory.
     */
    public static function onFileCreated(): string
    {
        return 'featherpanel:admin:file_manager:file:created';
    }

    /**
     * Callback: string path, bool was_directory.
     */
    public static function onFileDeleted(): string
    {
        return 'featherpanel:admin:file_manager:file:deleted';
    }

    /**
     * Callback: string path, array items.
     */
    public static function onDirectoryBrowsed(): string
    {
        return 'featherpanel:admin:file_manager:directory:browsed';
    }

    // File Manager Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onFileManagerError(): string
    {
        return 'featherpanel:admin:file_manager:error';
    }
}
