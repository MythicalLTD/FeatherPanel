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

namespace App\Helpers;

use App\App;
use App\Config\ConfigInterface;

/**
 * File trash settings pushed to FeatherWings in server configuration (SFTP, etc.).
 */
class WingsFileTrashConfig
{
    /**
     * @return array{enabled: bool, max_size_bytes: int, retention_days: int}
     */
    public static function forWings(): array
    {
        $config = App::getInstance(true)->getConfig();
        $maxMb = (int) $config->getSetting(ConfigInterface::FILE_TRASH_MAX_SIZE_MB, '512');
        $retentionDays = (int) $config->getSetting(ConfigInterface::FILE_TRASH_RETENTION_DAYS, '30');

        return [
            'enabled' => $config->getSetting(ConfigInterface::FILE_TRASH_ENABLED, 'false') === 'true',
            'max_size_bytes' => $maxMb > 0 ? $maxMb * 1024 * 1024 : 0,
            'retention_days' => $retentionDays,
        ];
    }
}
