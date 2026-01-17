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
use App\Plugins\Mixins\MixinManager;

class PluginManager
{
    private array $plugins = [];
    private $logger;

    public function __construct()
    {
        $this->logger = App::getInstance(true)->getLogger();
    }

    public function loadKernel(): void
    {
        global $eventManager;
        try {
            $pluginFiles = $this->getPluginFiles();
            foreach ($pluginFiles as $plugin) {
                $this->processPlugin($plugin, $eventManager);
            }
        } catch (\Exception $e) {
            $this->logger->error('Failed to start plugins: ' . $e->getMessage());
        }
    }

    /**
     * Get the loaded memory plugins.
     *
     * @return array The loaded memory plugins
     */
    public function getLoadedMemoryPlugins(): array
    {
        try {
            return $this->plugins;
        } catch (\Exception $e) {
            $this->logger->error('Failed to get plugin names: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Get plugins without loading them - used for cron jobs.
     *
     * @return array List of plugin names without loading
     */
    public function getPluginsWithoutLoader(): array
    {
        try {
            $pluginsDir = PluginHelper::getPluginsDir();
            if (empty($pluginsDir)) {
                return [];
            }
            $allFiles = scandir($pluginsDir);

            return array_values(array_filter($allFiles, function ($file) use ($pluginsDir) {
                if (in_array($file, ['.', '..', '', '.gitignore', '.gitkeep'])) {
                    return false;
                }

                // Only return directories (plugins are directories)
                return is_dir($pluginsDir . '/' . $file);
            }));
        } catch (\Exception $e) {
            $this->logger->error('Failed to get plugins without loader: ' . $e->getMessage());

            return [];
        }
    }

    public function doesPluginExist(string $identifier): bool
    {
        return array_key_exists($identifier, $this->plugins);
    }

    public function getEventManager(): PluginEvents
    {
        return new PluginEvents();
    }

    public function getLoadedPlugins(): array
    {
        return $this->plugins;
    }

    /**
     * Get mixins for a specific plugin.
     *
     * @param string $plugin The plugin identifier
     *
     * @return array List of mixin instances
     */
    public function getPluginMixins(string $plugin): array
    {
        return MixinManager::getMixinsForPlugin($plugin);
    }

    /**
     * Check if a plugin has a specific mixin.
     *
     * @param string $plugin The plugin identifier
     * @param string $mixinId The mixin identifier
     *
     * @return bool True if the plugin has the mixin, false otherwise
     */
    public function hasPluginMixin(string $plugin, string $mixinId): bool
    {
        return MixinManager::pluginHasMixin($plugin, $mixinId);
    }

    private function getPluginFiles(): array
    {
        $pluginsDir = PluginHelper::getPluginsDir();
        if (empty($pluginsDir)) {
            return [];
        }
        $allFiles = scandir($pluginsDir);

        return array_filter($allFiles, function ($file) use ($pluginsDir) {
            if (in_array($file, ['.', '..', '', '.gitignore', '.gitkeep'])) {
                return false;
            }

            // Only return directories (plugins are directories)
            return is_dir($pluginsDir . '/' . $file);
        });
    }

    private function processPlugin(string $plugin, $eventManager): void
    {
        if (!PluginConfig::isValidIdentifier($plugin)) {
            $this->logger->warning('Invalid plugin identifier: ' . $plugin);

            return;
        }

        $config = $this->loadPluginConfig($plugin);
        if (!$config) {
            return;
        }

        $this->validateAndLoadPlugin($plugin, $config, $eventManager);
    }

    private function loadPluginConfig(string $plugin): ?array
    {
        $config = PluginHelper::getPluginConfig($plugin);
        if (empty($config)) {
            $this->logger->warning('Plugin config is empty for: ' . $plugin);

            return null;
        }

        if (!PluginConfig::isConfigValid($config)) {
            $this->logger->warning('Invalid config for plugin: ' . $plugin);

            return null;
        }

        return $config;
    }

    private function validateAndLoadPlugin(string $plugin, array $config, $eventManager): void
    {
        if (in_array($plugin, $this->plugins)) {
            $this->logger->error('Duplicated plugin identifier: ' . $plugin);

            return;
        }

        if (!PluginDependencies::checkDependencies($config)) {
            $this->logger->error('Plugin ' . $plugin . ' has unmet dependencies! ' . json_encode($config));

            return;
        }

        // Load mixins for this plugin
        $this->loadMixinsForPlugin($plugin, $config);

        $this->loadPlugin($plugin, $config, $eventManager);
    }

    private function loadPlugin(string $plugin, array $config, $eventManager): void
    {
        $this->logger->debug('Plugin ' . $plugin . ' was loaded in the memory!');
        $this->plugins[] = $plugin;
        PluginProcessor::process($config['plugin']['identifier'], $eventManager);
    }

    /**
     * Load mixins for a plugin based on its configuration.
     *
     * @param string $plugin The plugin identifier
     * @param array $config The plugin configuration
     */
    private function loadMixinsForPlugin(string $plugin, array $config): void
    {
        try {
            // Check if plugin has mixins configured
            if (!isset($config['mixins']) || !is_array($config['mixins'])) {
                return;
            }

            $mixins = MixinManager::loadMixinsForPlugin($plugin);
            $mixinCount = count($mixins);

            if ($mixinCount > 0) {
                $this->logger->debug("Loaded {$mixinCount} mixins for plugin: {$plugin}");
            }
        } catch (\Throwable $e) {
            $this->logger->error("Failed to load mixins for plugin {$plugin}: " . $e->getMessage());
        }
    }
}
