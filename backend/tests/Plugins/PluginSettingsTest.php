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
use App\Plugins\PluginSettings;
use PHPUnit\Framework\TestCase;

class PluginSettingsTest extends TestCase
{
    private string $testIdentifier;

    protected function setUp(): void
    {
        App::getInstance(false, true, true);
        $this->testIdentifier = 'test_plugin_' . uniqid();
    }

    protected function tearDown(): void
    {
        // Clean up test settings
        try {
            $settings = PluginSettings::getSettings($this->testIdentifier);
            foreach ($settings as $setting) {
                PluginSettings::deleteSettings($this->testIdentifier, $setting['key']);
            }
        } catch (Exception $e) {
            // Ignore cleanup errors
        }
    }

    public function testGetSettingsReturnsArray()
    {
        $settings = PluginSettings::getSettings($this->testIdentifier);
        $this->assertIsArray($settings);
    }

    public function testSetAndGetSetting()
    {
        PluginSettings::setSetting($this->testIdentifier, 'test_key', 'test_value');
        $value = PluginSettings::getSetting($this->testIdentifier, 'test_key');
        $this->assertEquals('test_value', $value);
    }

    public function testSetSettingsWithArray()
    {
        PluginSettings::setSettings($this->testIdentifier, 'test_key', ['value' => 'array_value']);
        $value = PluginSettings::getSetting($this->testIdentifier, 'test_key');
        $this->assertEquals('array_value', $value);
    }

    public function testGetSettingReturnsNullForNonExistent()
    {
        $value = PluginSettings::getSetting($this->testIdentifier, 'non_existent_key');
        $this->assertNull($value);
    }

    public function testDeleteSettingsMarksSoftDelete()
    {
        PluginSettings::setSetting($this->testIdentifier, 'delete_test', 'value');
        PluginSettings::deleteSettings($this->testIdentifier, 'delete_test');

        // After deletion, should return null
        $value = PluginSettings::getSetting($this->testIdentifier, 'delete_test');
        $this->assertNull($value);
    }

    public function testGetSettingsReturnsOnlyActiveSettings()
    {
        PluginSettings::setSetting($this->testIdentifier, 'active_setting', 'active');
        PluginSettings::setSetting($this->testIdentifier, 'deleted_setting', 'deleted');
        PluginSettings::deleteSettings($this->testIdentifier, 'deleted_setting');

        $settings = PluginSettings::getSettings($this->testIdentifier);
        $keys = array_column($settings, 'key');

        $this->assertContains('active_setting', $keys);
        $this->assertNotContains('deleted_setting', $keys);
    }
}
