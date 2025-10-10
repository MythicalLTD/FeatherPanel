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

class ServerEvent implements PluginEvent
{
    /**
     * Callback: string user uuid, string server uuid, int allocation id.
     */
    public static function onServerAllocationCreated(): string
    {
        return 'featherpanel:server:allocation:create';
    }

    /**
     * Callback: string user uuid, string server uuid, int allocation id.
     */
    public static function onServerAllocationUpdated(): string
    {
        return 'featherpanel:server:allocation:update';
    }

    /**
     * Callback: string user uuid, string server uuid, int allocation id.
     */
    public static function onServerAllocationDeleted(): string
    {
        return 'featherpanel:server:allocation:delete';
    }

    /**
     * Callback: string user uuid, string server uuid, int database id.
     */
    public static function onServerDatabaseCreated(): string
    {
        return 'featherpanel:server:database:create';
    }

    /**
     * Callback: string user uuid, string server uuid, int database id.
     */
    public static function onServerDatabaseUpdated(): string
    {
        return 'featherpanel:server:database:update';
    }

    /**
     * Callback: string user uuid, string server uuid, int database id.
     */
    public static function onServerDatabaseDeleted(): string
    {
        return 'featherpanel:server:database:delete';
    }

    /**
     * Callback: string user uuid, string server uuid, string backup uuid.
     */
    public static function onServerBackupCreated(): string
    {
        return 'featherpanel:server:backup:create';
    }

    /**
     * Callback: string user uuid, string server uuid, string backup uuid.
     */
    public static function onServerBackupRestored(): string
    {
        return 'featherpanel:server:backup:restore';
    }

    /**
     * Callback: string user uuid, string server uuid, string backup uuid.
     */
    public static function onServerBackupLocked(): string
    {
        return 'featherpanel:server:backup:lock';
    }

    /**
     * Callback: string user uuid, string server uuid, string backup uuid.
     */
    public static function onServerBackupUnlocked(): string
    {
        return 'featherpanel:server:backup:unlock';
    }

    /**
     * Callback: string user uuid, string server uuid, string backup uuid.
     */
    public static function onServerBackupDeleted(): string
    {
        return 'featherpanel:server:backup:delete';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id.
     */
    public static function onServerScheduleCreated(): string
    {
        return 'featherpanel:server:schedule:create';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id.
     */
    public static function onServerScheduleUpdated(): string
    {
        return 'featherpanel:server:schedule:update';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id.
     */
    public static function onServerScheduleStatusToggled(): string
    {
        return 'featherpanel:server:schedule:status:toggle';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id.
     */
    public static function onServerScheduleDeleted(): string
    {
        return 'featherpanel:server:schedule:delete';
    }

    /**
     * Callback: string user uuid, string server uuid.
     */
    public static function onServerUpdated(): string
    {
        return 'featherpanel:server:update';
    }

    /**
     * Callback: string user uuid, string server uuid.
     */
    public static function onServerReinstalled(): string
    {
        return 'featherpanel:server:reinstall';
    }

    /**
     * Callback: string user uuid, string server uuid.
     */
    public static function onServerDeleted(): string
    {
        return 'featherpanel:server:delete';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id, int task id.
     */
    public static function onServerTaskCreated(): string
    {
        return 'featherpanel:server:task:create';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id, int task id.
     */
    public static function onServerTaskUpdated(): string
    {
        return 'featherpanel:server:task:update';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id, int task id.
     */
    public static function onServerTaskSequenceUpdated(): string
    {
        return 'featherpanel:server:task:sequence:update';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id, int task id.
     */
    public static function onServerTaskStatusToggled(): string
    {
        return 'featherpanel:server:task:status:toggle';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id, int task id.
     */
    public static function onServerTaskDeleted(): string
    {
        return 'featherpanel:server:task:delete';
    }

    /**
     * Callback: string user uuid, string server uuid, int subuser id.
     */
    public static function onServerSubuserCreated(): string
    {
        return 'featherpanel:server:subuser:create';
    }

    /**
     * Callback: string user uuid, string server uuid, int subuser id.
     */
    public static function onServerSubuserUpdated(): string
    {
        return 'featherpanel:server:subuser:update';
    }

    /**
     * Callback: string user uuid, string server uuid, int subuser id.
     */
    public static function onServerSubuserDeleted(): string
    {
        return 'featherpanel:server:subuser:delete';
    }

    /**
     * Callback: string user uuid, string server uuid, string action.
     */
    public static function onServerPowerAction(): string
    {
        return 'featherpanel:server:power:action';
    }

    /**
     * Callback: string user uuid, string server uuid.
     */
    public static function onServerFilesDeleted(): string
    {
        return 'featherpanel:server:files:delete';
    }

    /**
     * Callback: string user uuid, string server uuid, string directory path.
     */
    public static function onServerDirectoryCreated(): string
    {
        return 'featherpanel:server:directory:create';
    }

    /**
     * Callback: string user uuid, string server uuid, string pull id.
     */
    public static function onServerPullProcessDeleted(): string
    {
        return 'featherpanel:server:pull:delete';
    }

    /**
     * Callback: string user uuid, string server uuid, string file path.
     */
    public static function onServerFileWritten(): string
    {
        return 'featherpanel:server:file:write';
    }

    /**
     * Callback: string user uuid, string server uuid, string old path, string new path.
     */
    public static function onServerFileRenamed(): string
    {
        return 'featherpanel:server:file:rename';
    }

    /**
     * Callback: string user uuid, string server uuid, array file paths.
     */
    public static function onServerFilesCopied(): string
    {
        return 'featherpanel:server:files:copy';
    }

    /**
     * Callback: string user uuid, string server uuid, string file path.
     */
    public static function onServerFileCompressed(): string
    {
        return 'featherpanel:server:file:compress';
    }

    /**
     * Callback: string user uuid, string server uuid, string file path.
     */
    public static function onServerFileDecompressed(): string
    {
        return 'featherpanel:server:file:decompress';
    }

    /**
     * Callback: string user uuid, string server uuid, string file path, string permissions.
     */
    public static function onServerFilePermissionsChanged(): string
    {
        return 'featherpanel:server:file:permissions';
    }

    /**
     * Callback: string user uuid, string server uuid, string file path.
     */
    public static function onServerFileUploaded(): string
    {
        return 'featherpanel:server:file:upload';
    }

    /**
     * Callback: int server id, array server data, array created by.
     */
    public static function onServerCreated(): string
    {
        return 'featherpanel:server:created';
    }

    /**
     * Callback: array server data, array suspended by.
     */
    public static function onServerSuspended(): string
    {
        return 'featherpanel:server:suspended';
    }

    /**
     * Callback: array server data, array unsuspended by.
     */
    public static function onServerUnsuspended(): string
    {
        return 'featherpanel:server:unsuspended';
    }
}
