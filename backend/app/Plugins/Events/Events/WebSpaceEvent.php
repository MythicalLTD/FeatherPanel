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

class WebSpaceEvent implements PluginEvent
{
    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, array webspace, array context.
     */
    public static function onWebSpaceCreated(): string
    {
        return 'featherpanel:webspace:created';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, array changed fields, array context.
     */
    public static function onWebSpaceUpdated(): string
    {
        return 'featherpanel:webspace:updated';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, array context.
     */
    public static function onWebSpaceDeleted(): string
    {
        return 'featherpanel:webspace:deleted';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, array context.
     */
    public static function onWebSpaceSuspended(): string
    {
        return 'featherpanel:webspace:suspended';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, array context.
     */
    public static function onWebSpaceUnsuspended(): string
    {
        return 'featherpanel:webspace:unsuspended';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, array context.
     */
    public static function onWebSpaceReinstalled(): string
    {
        return 'featherpanel:webspace:reinstall';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, string|null backup uuid, array context.
     */
    public static function onWebSpaceBackupCreated(): string
    {
        return 'featherpanel:webspace:backup:create';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, string backup uuid, array context.
     */
    public static function onWebSpaceBackupDeleted(): string
    {
        return 'featherpanel:webspace:backup:delete';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, string backup uuid, array context.
     */
    public static function onWebSpaceBackupRestored(): string
    {
        return 'featherpanel:webspace:backup:restore';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, int subuser id, array context.
     */
    public static function onWebSpaceSubuserCreated(): string
    {
        return 'featherpanel:webspace:subuser:create';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, int subuser id, array context.
     */
    public static function onWebSpaceSubuserUpdated(): string
    {
        return 'featherpanel:webspace:subuser:update';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, int subuser id, array context.
     */
    public static function onWebSpaceSubuserDeleted(): string
    {
        return 'featherpanel:webspace:subuser:delete';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, int database id, array context.
     */
    public static function onWebSpaceDatabaseCreated(): string
    {
        return 'featherpanel:webspace:database:create';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, int database id, array context.
     */
    public static function onWebSpaceDatabaseDeleted(): string
    {
        return 'featherpanel:webspace:database:delete';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, int schedule id, array context.
     */
    public static function onWebSpaceScheduleCreated(): string
    {
        return 'featherpanel:webspace:schedule:create';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, int schedule id, array context.
     */
    public static function onWebSpaceScheduleUpdated(): string
    {
        return 'featherpanel:webspace:schedule:update';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, int schedule id, array context.
     */
    public static function onWebSpaceScheduleDeleted(): string
    {
        return 'featherpanel:webspace:schedule:delete';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, int mailbox id, array context.
     */
    public static function onWebSpaceMailboxCreated(): string
    {
        return 'featherpanel:webspace:mailbox:create';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, int mailbox id, array context.
     */
    public static function onWebSpaceMailboxDeleted(): string
    {
        return 'featherpanel:webspace:mailbox:delete';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, string path, array context.
     */
    public static function onWebSpaceDirectoryCreated(): string
    {
        return 'featherpanel:webspace:directory:create';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, array paths, array context.
     */
    public static function onWebSpaceFilesDeleted(): string
    {
        return 'featherpanel:webspace:files:delete';
    }

    /**
     * Callback: string|null user uuid, string webspace uuid, string uuid_short, array context.
     */
    public static function onWebSpaceConsoleAccessed(): string
    {
        return 'featherpanel:webspace:console:access';
    }
}
