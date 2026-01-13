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

namespace App\Plugins;

class PluginFlags
{
    /**
     * Get the flags.
     */
    public static function getFlags(): array
    {
        return [
            'hasInstallScript',
            'hasRemovalScript',
            'hasUpdateScript',
            'developerIgnoreInstallScript',
            'developerEscalateInstallScript',
            'userEscalateInstallScript',
            'hasEvents',
        ];
    }

    /**
     * Check if the flags are valid.
     *
     * @param array $flags The flags
     */
    public static function validFlags(array $flags): bool
    {
        $app = \App\App::getInstance(true);
        try {
            $app->getLogger()->debug('Processing plugin flags');
            $flagList = PluginFlags::getFlags();
            foreach ($flagList as $flag) {
                if (in_array($flag, $flags)) {
                    $app->getLogger()->debug('Valid flag: ' . $flag);

                    return true;
                }
            }
            $app->getLogger()->debug('Invalid flags: ' . implode(', ', $flags));

            return false;
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to validate flags: ' . $e->getMessage());

            return false;
        }
    }
}
