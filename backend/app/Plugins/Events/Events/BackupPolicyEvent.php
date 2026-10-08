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

class BackupPolicyEvent implements PluginEvent
{
    public static function onBackupPolicyCreated(): string
    {
        return 'featherpanel:admin:backup_policy:created';
    }

    public static function onBackupPolicyUpdated(): string
    {
        return 'featherpanel:admin:backup_policy:updated';
    }

    public static function onBackupPolicyDeleted(): string
    {
        return 'featherpanel:admin:backup_policy:deleted';
    }

    public static function onBackupPolicyRunStarted(): string
    {
        return 'featherpanel:admin:backup_policy:run:started';
    }

    public static function onBackupPolicyRunCompleted(): string
    {
        return 'featherpanel:admin:backup_policy:run:completed';
    }
}
