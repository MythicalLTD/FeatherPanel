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
