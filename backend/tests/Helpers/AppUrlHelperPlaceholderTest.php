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

use App\Helpers\AppUrlHelper;
use PHPUnit\Framework\TestCase;

class AppUrlHelperPlaceholderTest extends TestCase
{
    public function testEmptyAndWhitespaceAreUnset(): void
    {
        $this->assertTrue(AppUrlHelper::isUnsetOrPlaceholder(null));
        $this->assertTrue(AppUrlHelper::isUnsetOrPlaceholder(''));
        $this->assertTrue(AppUrlHelper::isUnsetOrPlaceholder('   '));
    }

    public function testDemoHostIsTreatedAsPlaceholder(): void
    {
        $this->assertTrue(AppUrlHelper::isUnsetOrPlaceholder('https://featherpanel.mythical.systems'));
        $this->assertTrue(AppUrlHelper::isUnsetOrPlaceholder('https://featherpanel.mythical.systems/'));
        $this->assertTrue(AppUrlHelper::isUnsetOrPlaceholder('http://FeatherPanel.Mythical.Systems'));
        $this->assertTrue(AppUrlHelper::isUnsetOrPlaceholder('featherpanel.mythical.systems'));
    }

    public function testRealInstallUrlsAreKept(): void
    {
        $this->assertFalse(AppUrlHelper::isUnsetOrPlaceholder('https://panel.example.com'));
        $this->assertFalse(AppUrlHelper::isUnsetOrPlaceholder('https://panel.example.com/'));
        $this->assertFalse(AppUrlHelper::isUnsetOrPlaceholder('https://my.featherpanel.customer.dev'));
    }
}
