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
