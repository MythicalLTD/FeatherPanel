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

use App\Runtime\WorkerRestart;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

class WorkerRestartTest extends TestCase
{
    private ?string $previousStamp = null;

    protected function setUp(): void
    {
        $path = WorkerRestart::stampPath();
        $this->previousStamp = is_file($path) ? (string) file_get_contents($path) : null;
    }

    protected function tearDown(): void
    {
        // Leave the process in classic mode for the tests that follow.
        (new ReflectionProperty(WorkerRestart::class, 'workerMode'))->setValue(null, false);

        $path = WorkerRestart::stampPath();
        if ($this->previousStamp === null) {
            @unlink($path);
        } else {
            file_put_contents($path, $this->previousStamp);
        }
    }

    public function testStampWrittenAfterBootRequestsARestart(): void
    {
        WorkerRestart::markWorkerBoot(microtime(true));
        $this->assertTrue(WorkerRestart::isWorkerMode());

        WorkerRestart::request('older stamp');
        WorkerRestart::markWorkerBoot(microtime(true) + 0.001);
        $this->assertFalse(WorkerRestart::isRestartRequested(), 'a stamp from before boot is ignored');

        usleep(2000);
        WorkerRestart::request('plugin installed');
        $this->assertTrue(WorkerRestart::isRestartRequested());
        $this->assertStringContainsString('plugin installed', (string) file_get_contents(WorkerRestart::stampPath()));
    }

    public function testOnlyAdminPluginAndRateLimitWritesTriggerARestart(): void
    {
        @unlink(WorkerRestart::stampPath());

        WorkerRestart::requestAfterAdminChange(Request::create('/api/admin/plugins', 'GET'));
        WorkerRestart::requestAfterAdminChange(Request::create('/api/admin/users/1', 'PATCH'));
        WorkerRestart::requestAfterAdminChange(Request::create('/api/admin/pluginsx', 'POST'));
        $this->assertFileDoesNotExist(WorkerRestart::stampPath());

        WorkerRestart::requestAfterAdminChange(Request::create('/api/admin/plugins/demo/uninstall', 'POST'));
        $this->assertFileExists(WorkerRestart::stampPath());
        $this->assertStringContainsString('POST /api/admin/plugins/demo/uninstall', (string) file_get_contents(WorkerRestart::stampPath()));

        @unlink(WorkerRestart::stampPath());
        WorkerRestart::requestAfterAdminChange(Request::create('/api/admin/rate-limits/global', 'PUT'));
        $this->assertFileExists(WorkerRestart::stampPath());
    }
}
