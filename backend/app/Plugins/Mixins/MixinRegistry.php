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

namespace App\Plugins\Mixins;

use App\App;

/**
 * Registry for system mixins.
 *
 * This class handles registering all built-in and custom mixins
 * during application startup.
 */
class MixinRegistry
{
    /**
     * Register all built-in and custom mixins.
     *
     * This should be called during application startup.
     */
    public static function registerMixins(): void
    {
        $logger = App::getInstance(true)->getLogger();
        $logger->debug('Registering mixins...');

        try {
            // Register built-in mixins
            self::registerBuiltInMixins();

            // Register custom mixins
            self::registerCustomMixins();

            $mixins = MixinManager::getRegisteredMixins();
            $logger->debug('Registered ' . count($mixins) . ' mixins: ' . implode(', ', $mixins));
        } catch (\Throwable $e) {
            $logger->error('Failed to register mixins: ' . $e->getMessage());
        }
    }

    /**
     * Register built-in mixins.
     */
    private static function registerBuiltInMixins(): void
    {
        $builtInMixins = [

        ];

        foreach ($builtInMixins as $mixinClass) {
            MixinManager::registerMixin($mixinClass);
        }
    }

    /**
     * Register custom mixins from the mixins directory.
     */
    private static function registerCustomMixins(): void
    {
        $logger = App::getInstance(true)->getLogger();
        $mixinsDir = dirname(__DIR__) . '/Mixins/Custom';

        if (!is_dir($mixinsDir)) {
            // Custom mixins directory doesn't exist yet
            return;
        }

        try {
            $files = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($mixinsDir, \RecursiveDirectoryIterator::SKIP_DOTS)
            );

            foreach ($files as $file) {
                if ($file->isFile() && $file->getExtension() === 'php') {
                    $className = self::getClassNameFromFile($file->getPathname());
                    if ($className) {
                        MixinManager::registerMixin($className);
                    }
                }
            }
        } catch (\Throwable $e) {
            $logger->error('Failed to load custom mixins: ' . $e->getMessage());
        }
    }

    /**
     * Get the fully qualified class name from a file.
     *
     * @param string $file The file path
     *
     * @return string|null The class name or null if not found
     */
    private static function getClassNameFromFile(string $file): ?string
    {
        $logger = App::getInstance(true)->getLogger();

        try {
            $content = file_get_contents($file);
            if (!$content) {
                return null;
            }

            // Extract namespace
            $namespaceMatches = [];
            if (preg_match('/namespace\s+([^;]+);/', $content, $namespaceMatches) !== 1) {
                return null;
            }

            // Extract class name
            $classMatches = [];
            if (preg_match('/class\s+(\w+)/', $content, $classMatches) !== 1) {
                return null;
            }

            $namespace = trim($namespaceMatches[1]);
            $className = trim($classMatches[1]);

            $fullClassName = $namespace . '\\' . $className;

            // Check if the class exists and implements the mixin interface
            if (class_exists($fullClassName) && is_subclass_of($fullClassName, AppMixin::class)) {
                return $fullClassName;
            }

            return null;
        } catch (\Throwable $e) {
            $logger->error('Failed to get class name from file ' . $file . ': ' . $e->getMessage());

            return null;
        }
    }
}
