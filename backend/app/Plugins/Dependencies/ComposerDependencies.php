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

namespace App\Plugins\Dependencies;

use App\App;

class ComposerDependencies implements Dependencies
{
    public static function isInstalled(string $identifier): bool
    {
        try {
            if (\Composer\InstalledVersions::isInstalled($identifier, false)) {
                return true;
            }

            return false;
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Error checking if ' . $identifier . ' is installed: ' . $e->getMessage());

            return false;
        }
    }
}
