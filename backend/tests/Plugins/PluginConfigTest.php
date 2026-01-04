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

use App\App;
use App\Plugins\PluginConfig;
use PHPUnit\Framework\TestCase;

class PluginConfigTest extends TestCase
{
    protected function setUp(): void
    {
        if (!defined('APP_DEBUG')) {
            define('APP_DEBUG', true);
        }
        App::getInstance(false, true, true);
    }

    public function testGetRequiredReturnsArray()
    {
        $required = PluginConfig::getRequired();
        $this->assertIsArray($required);
        $this->assertNotEmpty($required);
    }

    public function testGetRequiredContainsExpectedFields()
    {
        $required = PluginConfig::getRequired();
        $this->assertArrayHasKey('name', $required);
        $this->assertArrayHasKey('identifier', $required);
        $this->assertArrayHasKey('description', $required);
        $this->assertArrayHasKey('version', $required);
        $this->assertArrayHasKey('author', $required);
        $this->assertArrayHasKey('flags', $required);
        $this->assertArrayHasKey('dependencies', $required);
    }

    public function testIsValidIdentifierReturnsTrueForValidIdentifier()
    {
        $this->assertTrue(PluginConfig::isValidIdentifier('my_plugin'));
        $this->assertTrue(PluginConfig::isValidIdentifier('plugin123'));
        $this->assertTrue(PluginConfig::isValidIdentifier('Test_Plugin_Name'));
    }

    public function testIsValidIdentifierReturnsFalseForInvalidIdentifier()
    {
        $this->assertFalse(PluginConfig::isValidIdentifier(''));
        $this->assertFalse(PluginConfig::isValidIdentifier('plugin with spaces'));
        $this->assertFalse(PluginConfig::isValidIdentifier('plugin-with-dashes'));
        $this->assertFalse(PluginConfig::isValidIdentifier('plugin.with.dots'));
        $this->assertFalse(PluginConfig::isValidIdentifier('plugin@special'));
    }

    public function testIsConfigValidReturnsFalseForEmptyConfig()
    {
        $result = PluginConfig::isConfigValid([]);
        $this->assertFalse($result);
    }

    public function testIsConfigValidReturnsFalseForMissingRequiredFields()
    {
        $invalidConfig = [
            'plugin' => [
                'name' => 'Test Plugin',
                // Missing other required fields
            ],
        ];
        $result = PluginConfig::isConfigValid($invalidConfig);
        $this->assertFalse($result);
    }

    public function testIsConfigValidReturnsTrueForValidConfig()
    {
        $validConfig = [
            'plugin' => [
                'name' => 'Test Plugin',
                'identifier' => 'test_plugin',
                'description' => 'A test plugin',
                'flags' => ['hasInstallScript'],
                'version' => '1.0.0',
                'target' => 'v0.0.1',
                'author' => ['Test Author'],
                'icon' => 'https://example.com/icon.png',
                'dependencies' => [],
                'requiredConfigs' => [],
            ],
        ];
        $result = PluginConfig::isConfigValid($validConfig);
        $this->assertTrue($result);
    }
}
