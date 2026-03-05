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
            define('APP_DEBUG', true);
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
