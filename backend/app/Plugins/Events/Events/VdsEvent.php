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

class VdsEvent implements PluginEvent
{
    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, array context.
     */
    public static function onVdsCreated(): string
    {
        return 'featherpanel:vds:created';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, array changed fields, array context.
     */
    public static function onVdsUpdated(): string
    {
        return 'featherpanel:vds:updated';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, array context.
     */
    public static function onVdsDeleted(): string
    {
        return 'featherpanel:vds:deleted';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, string action, string task id, array context.
     */
    public static function onVdsPowerAction(): string
    {
        return 'featherpanel:vds:power:action';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, string reinstall id, array context.
     */
    public static function onVdsReinstalled(): string
    {
        return 'featherpanel:vds:reinstall';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, array context.
     */
    public static function onVdsSuspended(): string
    {
        return 'featherpanel:vds:suspended';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, array context.
     */
    public static function onVdsUnsuspended(): string
    {
        return 'featherpanel:vds:unsuspended';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, string backup id, array context.
     */
    public static function onVdsBackupCreated(): string
    {
        return 'featherpanel:vds:backup:create';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, string volid, array context.
     */
    public static function onVdsBackupDeleted(): string
    {
        return 'featherpanel:vds:backup:delete';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, string restore id, string volid, array context.
     */
    public static function onVdsBackupRestored(): string
    {
        return 'featherpanel:vds:backup:restore';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, int subuser id, array context.
     */
    public static function onVdsSubuserCreated(): string
    {
        return 'featherpanel:vds:subuser:create';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, int subuser id, array context.
     */
    public static function onVdsSubuserDeleted(): string
    {
        return 'featherpanel:vds:subuser:delete';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, array dns/network payload, array context.
     */
    public static function onVdsNetworkUpdated(): string
    {
        return 'featherpanel:vds:network:update';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, array qemu payload, array context.
     */
    public static function onVdsQemuHardwareUpdated(): string
    {
        return 'featherpanel:vds:qemu:hardware:update';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, string volid, array context.
     */
    public static function onVdsIsoMounted(): string
    {
        return 'featherpanel:vds:iso:mount';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, array context.
     */
    public static function onVdsIsoUnmounted(): string
    {
        return 'featherpanel:vds:iso:unmount';
    }

    /**
     * Callback: string|null user uuid, int vds instance id, int vmid, array context.
     */
    public static function onVdsConsoleAccessed(): string
    {
        return 'featherpanel:vds:console:access';
    }
}
