<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Plugins;

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
                    return false;
                }
            }

            // Check if the requirement is a php version
            if (strpos($dependency, 'php=') === 0) {
                $phpVersion = substr($dependency, strlen('php='));
                if (!PhpVersionDependencies::isInstalled($phpVersion)) {
                    return false;
                }
            }

            // Check if the requirement is a php extension
            if (strpos($dependency, 'php-ext=') === 0) {
                $ext = substr($dependency, strlen('php-ext='));
                if (!PhpExtensionDependencies::isInstalled($ext)) {
                    return false;
                }
            }

            // Check if the requirement is a plugin
            if (strpos($dependency, 'plugin=') === 0) {
                $plugin = substr($dependency, strlen('plugin='));
                if (!AppDependencies::isInstalled($plugin)) {
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
