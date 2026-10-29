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

namespace Tests\NodeAlerts;

use PHPUnit\Framework\TestCase;
use App\Services\NodeAlerts\NodeAlertService;

/**
 * Regression: failed-backup alerts used an id watermark, so a backup that started first but
 * failed after a newer one finished was skipped forever. The cursor is now completed_at|id.
 */
final class BackupCursorTest extends TestCase
{
    public function testRoundTrip(): void
    {
        $c = NodeAlertService::formatBackupCursor('2026-10-29 21:00:05', 9002);
        $this->assertSame('2026-10-29 21:00:05|9002', $c);
        $this->assertSame(['2026-10-29 21:00:05', 9002], NodeAlertService::parseBackupCursor($c));
    }

    public function testLegacyOrGarbageRestarts(): void
    {
        foreach ([null, '', '9002', '2026-10-29|1', "x' OR 1=1|2", 12] as $raw) {
            $this->assertNull(NodeAlertService::parseBackupCursor($raw));
        }
    }
}
