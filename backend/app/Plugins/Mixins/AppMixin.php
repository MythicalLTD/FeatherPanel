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

/**
 * Base interface for all plugin mixins.
 *
 * Mixins provide reusable functionality that can be included in multiple plugins.
 * They allow for better code organization and reuse across the plugin ecosystem.
 */
interface AppMixin
{
    /**
     * Initialize the mixin with the plugin identifier.
     *
     * @param string $pluginIdentifier The identifier of the plugin using this mixin
     * @param array $config Optional configuration for the mixin
     */
    public function initialize(string $pluginIdentifier, array $config = []): void;

    /**
     * Get the unique identifier for this mixin.
     *
     * @return string The mixin identifier
     */
    public static function getMixinIdentifier(): string;

    /**
     * Get the version of this mixin.
     *
     * @return string The mixin version
     */
    public static function getMixinVersion(): string;
}
