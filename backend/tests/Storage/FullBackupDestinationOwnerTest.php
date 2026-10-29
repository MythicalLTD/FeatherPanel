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

namespace Tests\Storage;

use PHPUnit\Framework\TestCase;

/**
 * Regression: a full backup used to take any destination_id from the body and hand it
 * straight to Wings, so a user could send a backup to another user's storage (IDOR).
 * Every user-facing backup entry point must resolve the destination through the
 * ownership check before using it.
 */
final class FullBackupDestinationOwnerTest extends TestCase
{
    public function testFullBackupResolvesDestinationForRequestingUser(): void
    {
        $src = (string) file_get_contents(__DIR__ . '/../../app/Controllers/User/Server/ServerBackupController.php');
        $start = strpos($src, 'private function createFullBackup(');
        $this->assertNotFalse($start);
        $end = strpos($src, 'ServerFullBackupService::run(', $start);
        $this->assertNotFalse($end);
        $body = substr($src, $start, $end - $start);

        $this->assertStringContainsString('StorageDestinationService::resolveForBackup(', $body);
        $this->assertDoesNotMatchRegularExpression('/\$fullDestinationId\s*=\s*isset\(\$body\[.destination_id.\]\)/', $body);
        $resolveAt = strpos($body, 'resolveForBackup(');
        $this->assertLessThan(strpos($body, 'chooseAdapter('), $resolveAt, 'ownership must be checked before the destination is used');
    }
}
