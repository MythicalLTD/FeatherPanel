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
 * Abstract base class for plugin mixins.
 *
 * This class provides common functionality for mixins and implements
 * the basic methods required by the AppMixin interface.
 */
abstract class AbstractMixin implements AppMixin
{
    /** @var string The plugin identifier that this mixin is attached to */
    protected string $pluginIdentifier = '';

    /** @var array Configuration for this mixin */
    protected array $config = [];

    protected $logger;

    public function initialize(string $pluginIdentifier, array $config = []): void
    {
        $this->pluginIdentifier = $pluginIdentifier;
        $this->config = $config;
        $this->logger = App::getInstance(true)->getLogger();

        $this->onInitialize();
    }

    /**
     * Get the plugin identifier.
     *
     * @return string The plugin identifier
     */
    public function getPluginIdentifier(): string
    {
        return $this->pluginIdentifier;
    }

    /**
     * Get the mixin configuration.
     *
     * @return array The mixin configuration
     */
    public function getConfig(): array
    {
        return $this->config;
    }

    /**
     * Get a configuration value.
     *
     * @param string $key The configuration key
     * @param mixed $default Default value if key is not found
     *
     * @return mixed The configuration value or default
     */
    public function getConfigValue(string $key, $default = null)
    {
        return $this->config[$key] ?? $default;
    }

    /**
     * Hook method called after initialization.
     *
     * Override this method in your mixin to perform additional initialization.
     */
    protected function onInitialize(): void
    {
        // Default implementation does nothing
    }

    /**
     * Log a debug message.
     *
     * @param string $message The message to log
     * @param array $context Additional context data
     */
    protected function debug(string $message, array $context = []): void
    {
        $mixinId = static::getMixinIdentifier();
        $this->logger->debug("[Mixin:{$mixinId}] {$message} " . json_encode($context));
    }

    /**
     * Log an error message.
     *
     * @param string $message The message to log
     * @param array $context Additional context data
     */
    protected function error(string $message, array $context = []): void
    {
        $mixinId = static::getMixinIdentifier();
        $this->logger->error("[Mixin:{$mixinId}] {$message} " . json_encode($context));
    }
}
