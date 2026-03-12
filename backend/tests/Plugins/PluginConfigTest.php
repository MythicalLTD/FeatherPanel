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

use App\App;
use App\Plugins\PluginConfig;
use PHPUnit\Framework\TestCase;

class PluginConfigTest extends TestCase
{
    protected function setUp(): void
    {
        if (!defined('APP_DEBUG')) {
            define('APP_DEBUG', false);
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
