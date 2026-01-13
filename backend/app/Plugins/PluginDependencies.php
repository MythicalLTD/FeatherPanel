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

use App\App;
use App\Plugins\Dependencies\AppDependencies;
use App\Plugins\Dependencies\ComposerDependencies;
use App\Plugins\Dependencies\PhpVersionDependencies;
use App\Plugins\Dependencies\PhpExtensionDependencies;

class PluginDependencies
{
    public static function checkDependencies(array $dependencies): bool
    {
        $requirements = $dependencies['plugin']['dependencies'];
        foreach ($requirements as $dependency) {
            // Check if the requirement is a composer package
            if (strpos($dependency, 'composer=') === 0) {
                $composerVersion = substr($dependency, strlen('composer='));
                if (!ComposerDependencies::isInstalled($composerVersion)) {
                    App::getInstance(true)->getLogger()->error('Composer package ' . $composerVersion . ' is not installed!');

                    return false;
                }
            }

            // Check if the requirement is a php version
            if (strpos($dependency, 'php=') === 0) {
                $phpVersion = substr($dependency, strlen('php='));
                if (!PhpVersionDependencies::isInstalled($phpVersion)) {
                    App::getInstance(true)->getLogger()->error('PHP version ' . $phpVersion . ' is not installed!');

                    return false;
                }
            }

            // Check if the requirement is a php extension
            if (strpos($dependency, 'php-ext=') === 0) {
                $ext = substr($dependency, strlen('php-ext='));
                if (!PhpExtensionDependencies::isInstalled($ext)) {
                    App::getInstance(true)->getLogger()->error('PHP extension ' . $ext . ' is not installed!');

                    return false;
                }
            }

            // Check if the requirement is a plugin
            if (strpos($dependency, 'plugin=') === 0) {
                $plugin = substr($dependency, strlen('plugin='));
                if (!AppDependencies::isInstalled($plugin)) {
                    App::getInstance(true)->getLogger()->error('Plugin ' . $plugin . ' is not installed!');

                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Return a list of unmet dependency strings for a plugin config.
     * The dependency strings are the same format as declared in conf.yml
     * (e.g. composer=vendor/package:^1, php=8.2, php-ext=gd, plugin=some_plugin).
     */
    public static function getUnmetDependencies(array $dependencies): array
    {
        $unmet = [];
        if (!isset($dependencies['plugin']['dependencies']) || !is_array($dependencies['plugin']['dependencies'])) {
            return $unmet;
        }

        foreach ($dependencies['plugin']['dependencies'] as $dependency) {
            // Composer package
            if (strpos($dependency, 'composer=') === 0) {
                $composerVersion = substr($dependency, strlen('composer='));
                if (!ComposerDependencies::isInstalled($composerVersion)) {
                    $unmet[] = $dependency;
                    continue;
                }
            }

            // PHP version
            if (strpos($dependency, 'php=') === 0) {
                $phpVersion = substr($dependency, strlen('php='));
                if (!PhpVersionDependencies::isInstalled($phpVersion)) {
                    $unmet[] = $dependency;
                    continue;
                }
            }

            // PHP extension
            if (strpos($dependency, 'php-ext=') === 0) {
                $ext = substr($dependency, strlen('php-ext='));
                if (!PhpExtensionDependencies::isInstalled($ext)) {
                    $unmet[] = $dependency;
                    continue;
                }
            }

            // Other plugin
            if (strpos($dependency, 'plugin=') === 0) {
                $plugin = substr($dependency, strlen('plugin='));
                if (!AppDependencies::isInstalled($plugin)) {
                    $unmet[] = $dependency;
                    continue;
                }
            }
        }

        return $unmet;
    }
}
