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
