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

namespace App\Cli\Commands;

use App\Cli\App;
use App\Cli\CommandBuilder;
use App\Helpers\PhpMyAdmin;

class Module extends App implements CommandBuilder
{
    /**
     * Available modules that can be installed.
     */
    private const AVAILABLE_MODULES = [
        'pma' => [
            'name' => 'phpMyAdmin',
            'description' => 'Web-based MySQL database administration tool',
            'installer' => 'installPhpMyAdmin',
        ],
    ];

    /**
     * Module installation paths (relative to public directory).
     */
    private const MODULE_PATHS = [
        'pma' => 'pma',
    ];

    public static function execute(array $args): void
    {
        $app = App::getInstance();

        // Route to sub-commands
        if (isset($args[1])) {
            $subCommand = strtolower($args[1]);
            switch ($subCommand) {
                case 'install':
                    self::installModule($app, $args[2] ?? null);
                    break;
                case 'list':
                    self::listModules($app);
                    break;
                case 'uninstall':
                    self::uninstallModule($app, $args[2] ?? null);
                    break;
                default:
                    $app->send('&cInvalid subcommand: ' . $subCommand);
                    $app->send('&7Available subcommands: install, list, uninstall');
                    $app->send('&7Usage: php fuse module <subcommand> [module]');
                    break;
            }
        } else {
            $app->send('&cPlease specify a subcommand: install, list, uninstall');
            $app->send('&7Usage: php fuse module <subcommand> [module]');
        }

        exit;
    }

    public static function getDescription(): string
    {
        return 'Manage FeatherPanel modules (install, list, uninstall)';
    }

    public static function getSubCommands(): array
    {
        return [
            'install' => 'Install a module (usage: module install <module>)',
            'list' => 'List available and installed modules',
            'uninstall' => 'Uninstall a module (usage: module uninstall <module>)',
        ];
    }

    /**
     * Install a module.
     */
    private static function installModule(App $app, ?string $moduleName): void
    {
        if ($moduleName === null) {
            $app->send('&cError: Module name is required');
            $app->send('&7Usage: php fuse module install <module>');
            $app->send('&7Available modules: ' . implode(', ', array_keys(self::AVAILABLE_MODULES)));

            return;
        }

        $moduleName = strtolower($moduleName);

        if (!isset(self::AVAILABLE_MODULES[$moduleName])) {
            $app->send('&cError: Unknown module "' . $moduleName . '"');
            $app->send('&7Available modules: ' . implode(', ', array_keys(self::AVAILABLE_MODULES)));

            return;
        }

        // Check if already installed
        if (self::isModuleInstalled($moduleName)) {
            $module = self::AVAILABLE_MODULES[$moduleName];
            $app->send('&eModule "' . $module['name'] . '" is already installed');

            return;
        }

        $module = self::AVAILABLE_MODULES[$moduleName];
        $app->send($app->color1 . '&lInstalling ' . $module['name'] . '...');
        $app->send('&7' . str_repeat('─', 50));

        try {
            // Call the installer method
            $installerMethod = $module['installer'];
            if (method_exists(self::class, $installerMethod)) {
                call_user_func([self::class, $installerMethod]);
                $app->send('&a&l✅ Successfully installed ' . $module['name'] . '!');
            } else {
                $app->send('&c&l❌ Error: Installer method not found for module "' . $moduleName . '"');
            }
        } catch (\Exception $e) {
            $app->send('&c&l❌ Installation failed: &r' . $e->getMessage());
            \App\App::getInstance(true)->getLogger()->error('Module installation failed: ' . $e->getMessage());
        }
    }

    /**
     * List all available and installed modules.
     */
    private static function listModules(App $app): void
    {
        $app->send($app->color1 . '&lFeatherPanel Modules');
        $app->send('&7' . str_repeat('─', 50));
        $app->send('');

        $installedModules = [];
        $availableModules = [];

        foreach (self::AVAILABLE_MODULES as $key => $module) {
            if (self::isModuleInstalled($key)) {
                $installedModules[$key] = $module;
            } else {
                $availableModules[$key] = $module;
            }
        }

        // Show installed modules
        if (!empty($installedModules)) {
            $app->send($app->color2 . '&lInstalled Modules:');
            foreach ($installedModules as $key => $module) {
                $app->send('  &a✓ &f' . $module['name'] . ' &7(' . $key . ')');
                $app->send('    &7' . $module['description']);
            }
            $app->send('');
        }

        // Show available modules
        if (!empty($availableModules)) {
            $app->send($app->color3 . '&lAvailable Modules:');
            foreach ($availableModules as $key => $module) {
                $app->send('  &7○ &f' . $module['name'] . ' &7(' . $key . ')');
                $app->send('    &7' . $module['description']);
            }
            $app->send('');
        }

        if (empty($installedModules) && empty($availableModules)) {
            $app->send('&7No modules available.');
        }

        $app->send('&7' . str_repeat('─', 50));
        $app->send('&7Use &fphp fuse module install <module> &7to install a module');
    }

    /**
     * Uninstall a module.
     */
    private static function uninstallModule(App $app, ?string $moduleName): void
    {
        if ($moduleName === null) {
            $app->send('&cError: Module name is required');
            $app->send('&7Usage: php fuse module uninstall <module>');

            return;
        }

        $moduleName = strtolower($moduleName);

        if (!isset(self::AVAILABLE_MODULES[$moduleName])) {
            $app->send('&cError: Unknown module "' . $moduleName . '"');
            $app->send('&7Available modules: ' . implode(', ', array_keys(self::AVAILABLE_MODULES)));

            return;
        }

        // Check if installed
        if (!self::isModuleInstalled($moduleName)) {
            $module = self::AVAILABLE_MODULES[$moduleName];
            $app->send('&eModule "' . $module['name'] . '" is not installed');

            return;
        }

        $module = self::AVAILABLE_MODULES[$moduleName];
        $app->send($app->color1 . '&lUninstalling ' . $module['name'] . '...');
        $app->send('&7' . str_repeat('─', 50));

        try {
            $publicDir = dirname(__DIR__, 3) . '/public';
            $modulePath = $publicDir . '/' . self::MODULE_PATHS[$moduleName];

            if (is_dir($modulePath)) {
                self::deleteDirectory($modulePath);
                $app->send('&a&l✅ Successfully uninstalled ' . $module['name'] . '!');
            } else {
                $app->send('&eModule directory not found, but marked as uninstalled');
            }
        } catch (\Exception $e) {
            $app->send('&c&l❌ Uninstallation failed: &r' . $e->getMessage());
            \App\App::getInstance(true)->getLogger()->error('Module uninstallation failed: ' . $e->getMessage());
        }
    }

    /**
     * Check if a module is installed.
     */
    private static function isModuleInstalled(string $moduleName): bool
    {
        if (!isset(self::MODULE_PATHS[$moduleName])) {
            return false;
        }

        $publicDir = dirname(__DIR__, 3) . '/public';
        $modulePath = $publicDir . '/' . self::MODULE_PATHS[$moduleName];

        return is_dir($modulePath);
    }

    /**
     * Install phpMyAdmin module.
     */
    private static function installPhpMyAdmin(): void
    {
        PhpMyAdmin::downloadPhpMyAdmin();
    }

    /**
     * Recursively delete a directory.
     */
    private static function deleteDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $files = array_diff(scandir($dir), ['.', '..']);

        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            if (is_dir($path)) {
                self::deleteDirectory($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }
}
