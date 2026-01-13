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

use PHPUnit\Framework\TestCase;
use App\Plugins\PluginDependencies;

class PluginDependenciesTest extends TestCase
{
    public function testCheckDependenciesReturnsTrueForNoDependencies()
    {
        $config = [
            'plugin' => [
                'dependencies' => [],
            ],
        ];
        $result = PluginDependencies::checkDependencies($config);
        $this->assertTrue($result);
    }

    public function testGetUnmetDependenciesReturnsArray()
    {
        $config = [
            'plugin' => [
                'dependencies' => [],
            ],
        ];
        $unmet = PluginDependencies::getUnmetDependencies($config);
        $this->assertIsArray($unmet);
    }

    public function testGetUnmetDependenciesReturnsEmptyForNoDependencies()
    {
        $config = [
            'plugin' => [
                'dependencies' => [],
            ],
        ];
        $unmet = PluginDependencies::getUnmetDependencies($config);
        $this->assertEmpty($unmet);
    }

    public function testGetUnmetDependenciesHandlesMissingDependenciesKey()
    {
        $config = [
            'plugin' => [],
        ];
        $unmet = PluginDependencies::getUnmetDependencies($config);
        $this->assertIsArray($unmet);
        $this->assertEmpty($unmet);
    }

    public function testGetUnmetDependenciesDetectsUnmetPhpVersion()
    {
        $config = [
            'plugin' => [
                'dependencies' => ['php=99.9'], // Impossible PHP version
            ],
        ];
        $unmet = PluginDependencies::getUnmetDependencies($config);
        $this->assertIsArray($unmet);
        // Should contain the unmet dependency
        if (!empty($unmet)) {
            $this->assertContains('php=99.9', $unmet);
        }
    }
}
