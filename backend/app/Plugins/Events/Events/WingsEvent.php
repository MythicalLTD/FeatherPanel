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

class WingsEvent implements PluginEvent
{
    // Wings Admin Events
    /**
     * Callback: int node id, array utilization data.
     */
    public static function onWingsNodeUtilizationRetrieved(): string
    {
        return 'featherpanel:wings:node:utilization:retrieved';
    }

    /**
     * Callback: int node id, array disk usage data.
     */
    public static function onWingsDockerDiskUsageRetrieved(): string
    {
        return 'featherpanel:wings:docker:disk:usage:retrieved';
    }

    /**
     * Callback: int node id, array prune results.
     */
    public static function onWingsDockerPruneCompleted(): string
    {
        return 'featherpanel:wings:docker:prune:completed';
    }

    /**
     * Callback: int node id, array ip addresses.
     */
    public static function onWingsNodeIpsRetrieved(): string
    {
        return 'featherpanel:wings:node:ips:retrieved';
    }

    /**
     * Callback: int node id, array system info.
     */
    public static function onWingsNodeSystemInfoRetrieved(): string
    {
        return 'featherpanel:wings:node:system:info:retrieved';
    }

    // Wings Server Events
    /**
     * Callback: string server uuid, array server info.
     */
    public static function onWingsServerInfoRetrieved(): string
    {
        return 'featherpanel:wings:server:info:retrieved';
    }

    /**
     * Callback: string server uuid, array install data.
     */
    public static function onWingsServerInstallRetrieved(): string
    {
        return 'featherpanel:wings:server:install:retrieved';
    }

    /**
     * Callback: string server uuid, array install results.
     */
    public static function onWingsServerInstallCompleted(): string
    {
        return 'featherpanel:wings:server:install:completed';
    }

    /**
     * Callback: array servers list.
     */
    public static function onWingsRemoteServersRetrieved(): string
    {
        return 'featherpanel:wings:servers:remote:retrieved';
    }

    /**
     * Callback: array reset results.
     */
    public static function onWingsServersResetCompleted(): string
    {
        return 'featherpanel:wings:servers:reset:completed';
    }

    /**
     * Callback: string server uuid, array status data.
     */
    public static function onWingsServerStatusUpdated(): string
    {
        return 'featherpanel:wings:server:status:updated';
    }

    /**
     * Callback: string server uuid, array status data.
     */
    public static function onWingsServerStatusRetrieved(): string
    {
        return 'featherpanel:wings:server:status:retrieved';
    }

    // Wings Backup Events
    /**
     * Callback: string backup uuid, array upload info.
     */
    public static function onWingsBackupUploadInfoRetrieved(): string
    {
        return 'featherpanel:wings:backup:upload:info:retrieved';
    }

    /**
     * Callback: string backup uuid, array completion data.
     */
    public static function onWingsBackupCompletionReported(): string
    {
        return 'featherpanel:wings:backup:completion:reported';
    }

    /**
     * Callback: string backup uuid, array restoration data.
     */
    public static function onWingsBackupRestorationReported(): string
    {
        return 'featherpanel:wings:backup:restoration:reported';
    }

    // Wings Activity Events
    /**
     * Callback: array activity data.
     */
    public static function onWingsActivityLogged(): string
    {
        return 'featherpanel:wings:activity:logged';
    }

    // Wings SFTP Events
    /**
     * Callback: array auth data.
     */
    public static function onWingsSftpAuthentication(): string
    {
        return 'featherpanel:wings:sftp:authentication';
    }

    // Wings Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onWingsError(): string
    {
        return 'featherpanel:wings:error';
    }

    /**
     * Callback: string server uuid, string error message.
     */
    public static function onWingsServerError(): string
    {
        return 'featherpanel:wings:server:error';
    }

    /**
     * Callback: int node id, string error message.
     */
    public static function onWingsNodeError(): string
    {
        return 'featherpanel:wings:node:error';
    }

    // Wings Connection Events
    /**
     * Callback: int node id, string status.
     */
    public static function onWingsNodeConnectionStatus(): string
    {
        return 'featherpanel:wings:node:connection:status';
    }

    /**
     * Callback: string server uuid, string status.
     */
    public static function onWingsServerConnectionStatus(): string
    {
        return 'featherpanel:wings:server:connection:status';
    }
}
