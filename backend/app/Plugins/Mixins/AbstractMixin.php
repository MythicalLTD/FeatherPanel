<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
