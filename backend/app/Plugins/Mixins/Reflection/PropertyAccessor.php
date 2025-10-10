<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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
