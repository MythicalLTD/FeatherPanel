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

use App\Chat\ServerSchedule;
use PHPUnit\Framework\TestCase;

/**
 * Regression test for GitHub issue #218: creating a schedule with is_active
 * sent as a JSON boolean (true/false) was rejected with a 500
 * "Invalid is_active" error because is_numeric(true) === false in PHP.
 *
 * This targets ServerSchedule::isValidActiveFlag() directly (no DB/App boot
 * required) since createSchedule()/updateSchedule() reach the database.
 */
class ServerScheduleIsValidActiveFlagTest extends TestCase
{
    public function testAcceptsJsonBooleans(): void
    {
        $this->assertTrue(ServerSchedule::isValidActiveFlag(true));
        $this->assertTrue(ServerSchedule::isValidActiveFlag(false));
    }

    public function testAcceptsNumericZeroOrOne(): void
    {
        $this->assertTrue(ServerSchedule::isValidActiveFlag(0));
        $this->assertTrue(ServerSchedule::isValidActiveFlag(1));
        $this->assertTrue(ServerSchedule::isValidActiveFlag('0'));
        $this->assertTrue(ServerSchedule::isValidActiveFlag('1'));
    }

    public function testRejectsOutOfRangeNumbers(): void
    {
        $this->assertFalse(ServerSchedule::isValidActiveFlag(2));
        $this->assertFalse(ServerSchedule::isValidActiveFlag(-1));
    }

    public function testRejectsNonNumericStrings(): void
    {
        $this->assertFalse(ServerSchedule::isValidActiveFlag('yes'));
        $this->assertFalse(ServerSchedule::isValidActiveFlag(''));
    }

    public function testRejectsNullAndArrays(): void
    {
        $this->assertFalse(ServerSchedule::isValidActiveFlag(null));
        $this->assertFalse(ServerSchedule::isValidActiveFlag([]));
    }
}
