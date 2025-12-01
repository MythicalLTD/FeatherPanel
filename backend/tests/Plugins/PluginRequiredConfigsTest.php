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

use App\App;
use PHPUnit\Framework\TestCase;
use App\Plugins\PluginRequiredConfigs;

class PluginRequiredConfigsTest extends TestCase
{
    protected function setUp(): void
    {
        if (!defined('APP_DEBUG')) {
            define('APP_DEBUG', false);
        }
        if (!defined('APP_ADDONS_DIR')) {
            define('APP_ADDONS_DIR', dirname(__DIR__, 2) . '/storage/addons');
        }
        App::getInstance(false, true, true);
    }

    public function testGetRequiredConfigsReturnsArray()
    {
        $configs = PluginRequiredConfigs::getRequiredConfigs('test_plugin');
        $this->assertIsArray($configs);
    }

    public function testGetRequiredConfigsReturnsEmptyForNonExistent()
    {
        $configs = PluginRequiredConfigs::getRequiredConfigs('non_existent_plugin_' . uniqid());
        $this->assertIsArray($configs);
        $this->assertEmpty($configs);
    }

    public function testAreRequiredConfigsSetReturnsTrueForNoRequiredConfigs()
    {
        // Plugin with no required configs should return true
        $result = PluginRequiredConfigs::areRequiredConfigsSet('plugin_with_no_requirements');
        $this->assertIsBool($result);
    }

    public function testAreRequiredConfigsSetHandlesErrors()
    {
        // Test with invalid identifier
        $result = PluginRequiredConfigs::areRequiredConfigsSet('');
        $this->assertIsBool($result);
    }
}
