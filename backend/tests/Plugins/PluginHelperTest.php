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
use App\Plugins\PluginHelper;
use PHPUnit\Framework\TestCase;

class PluginHelperTest extends TestCase
{
    protected function setUp(): void
    {
        if (!defined('APP_ADDONS_DIR')) {
            define('APP_ADDONS_DIR', dirname(__DIR__, 2) . '/storage/addons');
        }
        if (!defined('APP_DEBUG')) {
            define('APP_DEBUG', false);
        }
        App::getInstance(false, true, true);
    }

    public function testGetPluginsDirReturnsDirectory()
    {
        $dir = PluginHelper::getPluginsDir();
        // Should return empty string if dir doesn't exist or a valid path
        $this->assertIsString($dir);
    }

    public function testGetPluginConfigReturnsEmptyForNonExistent()
    {
        $config = PluginHelper::getPluginConfig('non_existent_plugin_' . uniqid());
        $this->assertIsArray($config);
        $this->assertEmpty($config);
    }

    public function testGetPluginConfigReturnsArrayForValidPlugin()
    {
        // Test with potentially existing plugin or empty
        $config = PluginHelper::getPluginConfig('test_plugin');
        $this->assertIsArray($config);
    }
}
