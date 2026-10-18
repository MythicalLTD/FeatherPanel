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

class ServerScheduleCronValidationTest extends TestCase
{
    public function testRejectsDaysThatNeverExistInTheMonth(): void
    {
        $this->assertFalse(ServerSchedule::validateCronExpression('*', '2', '30', '0', '0'));
        $this->assertFalse(ServerSchedule::validateCronExpression('*', '2', '31', '0', '0'));
        $this->assertFalse(ServerSchedule::validateCronExpression('*', '4', '31', '0', '0'));
        $this->assertFalse(ServerSchedule::validateCronExpression('*', '11', '31', '0', '0'));
    }

    public function testAcceptsValidFixedDates(): void
    {
        $this->assertTrue(ServerSchedule::validateCronExpression('*', '2', '29', '0', '0'));
        $this->assertTrue(ServerSchedule::validateCronExpression('*', '4', '30', '0', '0'));
        $this->assertTrue(ServerSchedule::validateCronExpression('*', '*', '31', '0', '0'));
        $this->assertTrue(ServerSchedule::validateCronExpression('*', '*', '*', '*', '*'));
    }
}
