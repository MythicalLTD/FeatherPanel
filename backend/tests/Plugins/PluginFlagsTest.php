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
use App\Plugins\PluginFlags;
use PHPUnit\Framework\TestCase;

class PluginFlagsTest extends TestCase
{
    protected function setUp(): void
    {
        if (!defined('APP_DEBUG')) {
            define('APP_DEBUG', true);
        }
        App::getInstance(false, true, true);
    }

    public function testGetFlagsReturnsArray()
    {
        $flags = PluginFlags::getFlags();
        $this->assertIsArray($flags);
        $this->assertNotEmpty($flags);
    }

    public function testGetFlagsContainsExpectedFlags()
    {
        $flags = PluginFlags::getFlags();
        $this->assertContains('hasInstallScript', $flags);
        $this->assertContains('hasRemovalScript', $flags);
        $this->assertContains('hasUpdateScript', $flags);
        $this->assertContains('hasEvents', $flags);
    }

    public function testValidFlagsReturnsTrueForValidFlag()
    {
        $result = PluginFlags::validFlags(['hasInstallScript']);
        $this->assertTrue($result);
    }

    public function testValidFlagsReturnsTrueForMultipleValidFlags()
    {
        $result = PluginFlags::validFlags(['hasInstallScript', 'hasEvents']);
        $this->assertTrue($result);
    }

    public function testValidFlagsReturnsFalseForInvalidFlags()
    {
        $result = PluginFlags::validFlags(['invalidFlag', 'anotherInvalidFlag']);
        $this->assertFalse($result);
    }

    public function testValidFlagsReturnsFalseForEmptyArray()
    {
        $result = PluginFlags::validFlags([]);
        $this->assertFalse($result);
    }
}
