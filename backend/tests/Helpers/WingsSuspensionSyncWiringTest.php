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

namespace App\Tests\Helpers;

use PHPUnit\Framework\TestCase;

/**
 * Suspend/unsuspend used to update only the panel database. Wings does not
 * refresh configuration on a timer, so unsuspended servers kept closing
 * consoles until something else (like reassigning subusers) synced them.
 * These assertions lock the wiring so that path cannot regress.
 */
class WingsSuspensionSyncWiringTest extends TestCase
{
    public function testHelperPushesConfigurationThroughSyncServer(): void
    {
        $src = file_get_contents($this->backendPath('app/Services/Server/WingsSuspensionSync.php'));
        $this->assertNotFalse($src);
        $this->assertStringContainsString('function sync(', $src);
        $this->assertStringContainsString('syncServer($uuid)', $src);
        $this->assertStringContainsString('function afterSuspend(', $src);
        $this->assertStringContainsString('function afterUnsuspend(', $src);
    }

    public function testAdminSuspendAndUnsuspendSyncToWings(): void
    {
        $src = file_get_contents($this->backendPath('app/Controllers/Admin/ServersController.php'));
        $this->assertNotFalse($src);
        $this->assertMatchesRegularExpression('/function suspend\(.*?WingsSuspensionSync::afterSuspend/s', $src);
        $this->assertMatchesRegularExpression('/function unsuspend\(.*?WingsSuspensionSync::afterUnsuspend/s', $src);
    }

    public function testAutomaticSuspendPathsSyncToWings(): void
    {
        $cleanup = file_get_contents($this->backendPath('app/Services/InactiveCleanup/InactiveCleanupService.php'));
        $this->assertNotFalse($cleanup);
        $this->assertMatchesRegularExpression('/function suspend\(.*?WingsSuspensionSync::afterSuspend/s', $cleanup);

        $zeroTrust = file_get_contents($this->backendPath('app/Services/FeatherZeroTrust/SuspensionService.php'));
        $this->assertNotFalse($zeroTrust);
        $this->assertStringContainsString('WingsSuspensionSync::afterSuspend', $zeroTrust);

        $expiry = file_get_contents($this->backendPath('storage/cron/php/ZCheckExpiredServers.php'));
        $this->assertNotFalse($expiry);
        $this->assertStringContainsString('WingsSuspensionSync::afterSuspend', $expiry);
    }

    private function backendPath(string $relative): string
    {
        return dirname(__DIR__, 2) . '/' . $relative;
    }
}
