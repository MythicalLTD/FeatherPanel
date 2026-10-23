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

namespace App\Cli\Utils;

use App\Plugins\ObsoleteAddons;

/**
 * Finds CLI commands shipped by plugins in {addon}/Commands/*.php.
 *
 * The addons directory is resolved from the APP_ADDONS_DIR constant (set by the
 * `cli` entry point) and from the location of this file, so discovery works no
 * matter which directory `php cli` is started from (/var/www/html in Docker,
 * /var/www/featherpanel or /var/www/featherpanel/backend on bare metal).
 * The old `getcwd()/backend/storage/addons` location is still checked last for
 * backward compatibility.
 */
final class PluginCommandLocator
{
    /**
     * Get the existing addon directories to scan, most specific first, without duplicates.
     *
     * @param string|null $cwd Working directory used for the legacy lookup (defaults to getcwd())
     *
     * @return list<string>
     */
    public static function getAddonDirectories(?string $cwd = null): array
    {
        $candidates = [];
        $configured = defined('APP_ADDONS_DIR') ? (string) constant('APP_ADDONS_DIR') : '';
        if ($configured !== '') {
            $candidates[] = $configured;
        }

        // backend/app/Cli/Utils -> backend/storage/addons
        $candidates[] = dirname(__DIR__, 3) . '/storage/addons';

        $cwd ??= (getcwd() ?: '');
        if ($cwd !== '') {
            $candidates[] = rtrim($cwd, '/') . '/backend/storage/addons';
        }

        $directories = [];
        $seen = [];
        foreach ($candidates as $candidate) {
            if (!is_dir($candidate)) {
                continue;
            }
            $real = realpath($candidate);
            $key = $real !== false ? $real : rtrim($candidate, '/');
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $directories[] = $key;
        }

        return $directories;
    }

    /**
     * List every plugin command file without loading it.
     *
     * When the same plugin exists in more than one addon directory, only the first one is used.
     *
     * @param list<string>|null $directories Addon directories (defaults to getAddonDirectories())
     *
     * @return list<array{plugin: string, name: string, class: string, file: string}>
     */
    public static function listCommandFiles(?array $directories = null): array
    {
        $directories ??= self::getAddonDirectories();
        $commands = [];
        $seenPlugins = [];

        foreach ($directories as $directory) {
            $entries = @scandir($directory);
            if ($entries === false) {
                continue;
            }

            foreach (array_diff($entries, ['.', '..']) as $plugin) {
                if (isset($seenPlugins[$plugin]) || ObsoleteAddons::isObsolete($plugin)) {
                    continue;
                }

                $commandsFolder = $directory . '/' . $plugin . '/Commands';
                if (!is_dir($directory . '/' . $plugin)) {
                    continue;
                }
                $seenPlugins[$plugin] = true;
                if (!is_dir($commandsFolder)) {
                    continue;
                }

                $commandFiles = @scandir($commandsFolder);
                if ($commandFiles === false) {
                    continue;
                }

                foreach ($commandFiles as $commandFile) {
                    if (!str_ends_with($commandFile, '.php')) {
                        continue;
                    }

                    $className = pathinfo($commandFile, PATHINFO_FILENAME);
                    $commands[] = [
                        'plugin' => $plugin,
                        'name' => $className,
                        'class' => "App\\Addons\\$plugin\\Commands\\$className",
                        'file' => $commandsFolder . '/' . $commandFile,
                    ];
                }
            }
        }

        return $commands;
    }

    /**
     * Find and load a plugin command by name (case-insensitive class basename).
     *
     * @param list<string>|null $directories Addon directories (defaults to getAddonDirectories())
     *
     * @return class-string|null The command class, or null when no plugin provides it
     */
    public static function findCommand(string $commandName, ?array $directories = null): ?string
    {
        if ($commandName === '') {
            return null;
        }

        foreach (self::listCommandFiles($directories) as $command) {
            if (strtolower($command['name']) !== strtolower($commandName)) {
                continue;
            }

            $class = self::loadCommand($command);
            if ($class !== null) {
                return $class;
            }
        }

        return null;
    }

    /**
     * Require a command file and return its class name when the class exists.
     *
     * @param array{plugin: string, name: string, class: string, file: string} $command
     *
     * @return class-string|null
     */
    public static function loadCommand(array $command): ?string
    {
        require_once $command['file'];

        return class_exists($command['class']) ? $command['class'] : null;
    }
}
