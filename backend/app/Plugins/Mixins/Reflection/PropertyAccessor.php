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

namespace App\Plugins\Mixins\Reflection;

/**
 * Trait for intercepting property access.
 *
 * This trait can be used in your class to intercept property access
 * and apply overrides dynamically without modifying the original properties.
 */
trait PropertyAccessor
{
    /**
     * Magic method to intercept property access.
     *
     * @param string $property The property name
     *
     * @return mixed The property value
     */
    public function __get(string $property)
    {
        // Get the property value with overrides applied
        return ClassPatcher::getPropertyValue($this, $property);
    }

    /**
     * Magic method to intercept property assignment.
     *
     * @param string $property The property name
     * @param mixed $value The value to assign
     *
     * @return void
     */
    public function __set(string $property, $value)
    {
        // Override the property in the class patcher
        ClassPatcher::overrideProperty(get_class($this), $property, $value);
    }

    /**
     * Magic method to check if a property is set.
     *
     * @param string $property The property name
     *
     * @return bool Whether the property is set
     */
    public function __isset(string $property)
    {
        try {
            $value = ClassPatcher::getPropertyValue($this, $property);

            return isset($value);
        } catch (\Throwable $e) {
            return false;
        }
    }
}
