<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
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
        return 'featherpanel:user:server:allocation:deleted';
    }

    /**
     * Callback: string user uuid, string server uuid, int database id.
     */
    public static function onServerDatabaseCreated(): string
    {
        return 'featherpanel:user:server:database:created';
    }

    /**
     * Callback: string user uuid, string server uuid, int database id.
     */
    public static function onServerDatabaseUpdated(): string
    {
        return 'featherpanel:user:server:database:updated';
    }

    /**
     * Callback: string user uuid, string server uuid, int database id.
     */
    public static function onServerDatabaseDeleted(): string
    {
        return 'featherpanel:user:server:database:deleted';
    }

    /**
     * Callback: string user uuid, string server uuid, string backup uuid.
     */
    public static function onServerBackupCreated(): string
    {
        return 'featherpanel:user:server:backup:created';
    }

    /**
     * Callback: string user uuid, string server uuid, string backup uuid.
     */
    public static function onServerBackupRestored(): string
    {
        return 'featherpanel:user:server:backup:restored';
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
        return 'featherpanel:user:server:backup:deleted';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id.
     */
    public static function onServerScheduleCreated(): string
    {
        return 'featherpanel:user:server:schedule:created';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id.
     */
    public static function onServerScheduleUpdated(): string
    {
        return 'featherpanel:user:server:schedule:updated';
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
        return 'featherpanel:user:server:schedule:deleted';
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
        return 'featherpanel:user:server:task:created';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id, int task id.
     */
    public static function onServerTaskUpdated(): string
    {
        return 'featherpanel:user:server:task:updated';
    }

    /**
     * Callback: string user uuid, string server uuid, int schedule id, int task id.
     */
    public static function onServerTaskSequenceUpdated(): string
    {
        return 'featherpanel:user:server:task:sequence:updated';
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
        return 'featherpanel:user:server:task:deleted';
    }

    /**
     * Callback: string user uuid, string server uuid, int subuser id.
     */
    public static function onServerSubuserCreated(): string
    {
        return 'featherpanel:user:server:subuser:created';
    }

    /**
     * Callback: string user uuid, string server uuid, int subuser id.
     */
    public static function onServerSubuserUpdated(): string
    {
        return 'featherpanel:user:server:subuser:updated';
    }

    /**
     * Callback: string user uuid, string server uuid, int subuser id.
     */
    public static function onServerSubuserDeleted(): string
    {
        return 'featherpanel:user:server:subuser:deleted';
    }

    /**
     * Callback: string user uuid, string server uuid, string action.
     */
    public static function onServerPowerAction(): string
    {
        return 'featherpanel:server:power:action';
    }

    /**
     * Callback: string user uuid, string server uuid, string power action, int hook id, string hook type.
     */
    public static function onServerLifecycleHookStarted(): string
    {
        return 'featherpanel:server:lifecycle-hook:started';
    }

    /**
     * Callback: string user uuid, string server uuid, string power action, int hook id, string hook type.
     */
    public static function onServerLifecycleHookCompleted(): string
    {
        return 'featherpanel:server:lifecycle-hook:completed';
    }

    /**
     * Callback: string user uuid, string server uuid, string power action, int hook id, string hook type, string error.
     */
    public static function onServerLifecycleHookFailed(): string
    {
        return 'featherpanel:server:lifecycle-hook:failed';
    }

    /**
     * Callback: string user uuid, string server uuid, string power action, int hook id, int step id, string task type.
     */
    public static function onServerLifecycleHookStepStarted(): string
    {
        return 'featherpanel:server:lifecycle-hook:step:started';
    }

    /**
     * Callback: string user uuid, string server uuid, string power action, int hook id, int step id, string task type.
     */
    public static function onServerLifecycleHookStepCompleted(): string
    {
        return 'featherpanel:server:lifecycle-hook:step:completed';
    }

    /**
     * Callback: string user uuid, string server uuid, string power action, int hook id, int step id, string task type, string error.
     */
    public static function onServerLifecycleHookStepFailed(): string
    {
        return 'featherpanel:server:lifecycle-hook:step:failed';
    }

    /**
     * Callback: string user uuid, string server uuid.
     */
    public static function onServerFilesDeleted(): string
    {
        return 'featherpanel:user:server:files:deleted';
    }

    /**
     * Callback: string user uuid, string server uuid, string directory path.
     */
    public static function onServerDirectoryCreated(): string
    {
        return 'featherpanel:user:server:directory:created';
    }

    /**
     * Callback: string user uuid, string server uuid, string pull id.
     */
    public static function onServerPullProcessDeleted(): string
    {
        return 'featherpanel:user:server:pull:deleted';
    }

    /**
     * Callback: string user uuid, string server uuid, string file path.
     */
    public static function onServerFileWritten(): string
    {
        return 'featherpanel:user:server:file:saved';
    }

    /**
     * Callback: string user uuid, string server uuid, string old path, string new path.
     */
    public static function onServerFileRenamed(): string
    {
        return 'featherpanel:user:server:file:renamed';
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
        return 'featherpanel:user:server:file:uploaded';
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

    /**
     * Callback: array server data, array transferred by.
     */
    public static function onServerTransferred(): string
    {
        return 'featherpanel:server:transferred';
    }

    /**
     * Callback: array server data, bool successful, int|null destination_node_id.
     */
    public static function onServerTransferCompleted(): string
    {
        return 'featherpanel:server:transfer:completed';
    }

    /**
     * Callback: array server data, bool successful, string|null error.
     */
    public static function onServerTransferFailed(): string
    {
        return 'featherpanel:server:transfer:failed';
    }

    /**
     * Callback: array server data, array source_node, array destination_node, array initiated_by.
     */
    public static function onServerTransferInitiated(): string
    {
        return 'featherpanel:server:transfer:initiated';
    }

    /**
     * Callback: array server data, array cancelled_by.
     */
    public static function onServerTransferCancelled(): string
    {
        return 'featherpanel:server:transfer:cancelled';
    }
}
