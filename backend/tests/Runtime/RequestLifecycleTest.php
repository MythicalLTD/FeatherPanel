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
use App\Runtime\RequestLifecycle;

class RequestLifecycleTest extends TestCase
{
    protected function tearDown(): void
    {
        RequestLifecycle::removeReset('test.counter');
        RequestLifecycle::removeReset('test.failing');
        ignore_user_abort(false);
        date_default_timezone_set('UTC');
    }

    public function testResetRestoresRuntimeStateAndRunsHooks(): void
    {
        $calls = 0;
        RequestLifecycle::onReset('test.failing', static function (): void {
            throw new RuntimeException('plugin hook failed');
        });
        RequestLifecycle::onReset('test.counter', static function () use (&$calls): void {
            ++$calls;
        });

        // State a previous request in the same worker could have left behind.
        ignore_user_abort(true);
        date_default_timezone_set('Europe/Vienna');

        $previousLog = ini_set('error_log', '/dev/null');
        try {
            RequestLifecycle::reset();
        } finally {
            ini_set('error_log', (string) $previousLog);
        }

        $this->assertSame(0, ignore_user_abort());
        $this->assertSame('UTC', date_default_timezone_get());
        $this->assertSame(1, $calls, 'a failing hook must not stop the others');

        RequestLifecycle::removeReset('test.counter');
        RequestLifecycle::removeReset('test.failing');
        RequestLifecycle::reset();
        $this->assertSame(1, $calls, 'removed hooks no longer run');
    }
}
