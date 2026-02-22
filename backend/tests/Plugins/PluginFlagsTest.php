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
use App\Plugins\PluginFlags;
use PHPUnit\Framework\TestCase;

class PluginFlagsTest extends TestCase
{
    protected function setUp(): void
    {
        if (!defined('APP_DEBUG')) {
            define('APP_DEBUG', false);
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
