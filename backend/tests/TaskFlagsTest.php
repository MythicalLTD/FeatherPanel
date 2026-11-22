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

use App\Chat\Task;
use PHPUnit\Framework\TestCase;

class TaskFlagsTest extends TestCase
{
    public function testJsonBooleansBecomeIntegers(): void
    {
        $out = Task::normalizeFlags(['continue_on_failure' => true, 'is_queued' => false]);

        $this->assertSame(1, $out['continue_on_failure']);
        $this->assertSame(0, $out['is_queued']);
    }

    public function testFalseSurvivesTheRequiredFieldCheck(): void
    {
        // createTask() rejects a field with isset() === false and then needs is_numeric(); both must hold for false.
        $out = Task::normalizeFlags(['continue_on_failure' => false]);

        $this->assertTrue(isset($out['continue_on_failure']));
        $this->assertTrue(is_numeric($out['continue_on_failure']));
        $this->assertSame(0, $out['continue_on_failure']);
    }

    public function testNumbersAndStringsAreLeftAlone(): void
    {
        $in = ['continue_on_failure' => '1', 'is_queued' => 0, 'time_offset' => 5, 'payload' => 'start'];

        $this->assertSame($in, Task::normalizeFlags($in));
    }

    public function testInvalidValuesStillReachTheValidation(): void
    {
        // Only real booleans are converted. Anything else keeps failing validation exactly as before.
        $out = Task::normalizeFlags(['continue_on_failure' => 'yes', 'is_queued' => 2]);

        $this->assertSame('yes', $out['continue_on_failure']);
        $this->assertSame(2, $out['is_queued']);
    }

    public function testMissingFlagsAreNotAdded(): void
    {
        $this->assertSame(['payload' => 'x'], Task::normalizeFlags(['payload' => 'x']));
        $this->assertArrayNotHasKey('is_queued', Task::normalizeFlags(['continue_on_failure' => true]));
    }
}
